import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  applyCalendarItemToCampaign,
  applyProgramSuggestion,
  applySuggestionToCampaign,
  buildCalendarCampaignForm,
  buildSuggestionEditForm,
  formatSuggestionForCopy,
  updateSuggestionFields,
} from '@/lib/ai-apply-suggestion';
import { updateSuggestionStatus } from '@/lib/ai-suggestions';

export function useSuggestionActions({ businessId, loyaltyProgram, reward }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionId, setActionId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('use');
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const [activeCalendarItem, setActiveCalendarItem] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const invalidateSuggestions = () => {
    queryClient.invalidateQueries({ queryKey: ['ai-all-suggestions', businessId] });
    queryClient.invalidateQueries({ queryKey: ['ai-calendar-hub-items', businessId] });
    queryClient.invalidateQueries({ queryKey: ['onboarding-progress', businessId] });
    queryClient.invalidateQueries({ queryKey: ['ai-onboarding', businessId] });
  };

  const applyMutation = useMutation({
    mutationFn: async ({ suggestion, form, calendarItem }) => {
      if (calendarItem) {
        return applyCalendarItemToCampaign(businessId, calendarItem, form);
      }

      if (suggestion.suggestion_type === 'offer' || suggestion.suggestion_type === 'notification') {
        return applySuggestionToCampaign(businessId, suggestion, form);
      }

      if (suggestion.suggestion_type === 'reward' || suggestion.suggestion_type === 'threshold') {
        return applyProgramSuggestion({
          businessId,
          loyaltyProgram,
          reward,
          suggestion,
          formOverrides: form,
        });
      }

      throw new Error('Type de suggestion non pris en charge');
    },
    onSuccess: (result) => {
      invalidateSuggestions();
      queryClient.invalidateQueries({ queryKey: ['campaign-ai-origins', businessId] });
      setModalOpen(false);
      setActiveSuggestion(null);
      setActiveCalendarItem(null);
      setEditForm(null);

      if (result.redirectPath?.includes('/dashboard/offers')) {
        toast.success('Brouillon créé — activez l’offre quand vous êtes prêt', {
          action: {
            label: 'Ouvrir',
            onClick: () => navigate(result.redirectPath),
          },
        });
      } else if (result.redirectPath === '/dashboard/program') {
        queryClient.invalidateQueries({ queryKey: ['reward', businessId] });
        queryClient.invalidateQueries({ queryKey: ['my-business'] });
        toast.success('Récompense ajoutée à votre programme', {
          action: {
            label: 'Voir le programme',
            onClick: () => navigate('/dashboard/program'),
          },
        });
      } else if (result.redirectPath) {
        toast.success('Idée appliquée');
        navigate(result.redirectPath);
      }
    },
    onError: (error) => {
      toast.error(error?.message || 'Application impossible');
    },
    onSettled: () => setActionId(null),
  });

  const openModalForSuggestion = (suggestion, mode) => {
    setActiveCalendarItem(null);
    setActiveSuggestion(suggestion);
    setModalMode(mode);
    setEditForm(buildSuggestionEditForm(suggestion));
    setModalOpen(true);
  };

  const openModalForCalendar = (item) => {
    setActiveSuggestion(null);
    setActiveCalendarItem(item);
    setModalMode('use');
    setEditForm(buildCalendarCampaignForm(item));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (applyMutation.isPending) return;
    setModalOpen(false);
    setActiveSuggestion(null);
    setActiveCalendarItem(null);
    setEditForm(null);
  };

  const handleDiscard = async (suggestion) => {
    setActionId(suggestion.id);
    try {
      await updateSuggestionStatus(suggestion.id, 'discarded');
      invalidateSuggestions();
      toast.success('Idée ignorée');
    } catch (error) {
      toast.error(error?.message || 'Action impossible');
    } finally {
      setActionId(null);
    }
  };

  const handleCopy = async (suggestion) => {
    try {
      await navigator.clipboard.writeText(formatSuggestionForCopy(suggestion));
      toast.success('Copié');
    } catch {
      toast.error('Copie impossible');
    }
  };

  const handleModalSubmit = async () => {
    if (modalMode === 'edit' && activeSuggestion) {
      setActionId(activeSuggestion.id);
      try {
        const patch = {
          status: 'modified',
          title: editForm.title?.trim() || activeSuggestion.title,
          description: editForm.description?.trim() || activeSuggestion.description,
        };

        if (activeSuggestion.suggestion_type === 'offer' || activeSuggestion.suggestion_type === 'notification') {
          patch.customer_message = editForm.message?.trim() || activeSuggestion.customer_message;
          patch.description = editForm.offer_label?.trim() || activeSuggestion.description;
          if (activeSuggestion.suggestion_type === 'notification') {
            patch.wallet_notification_title = editForm.title?.trim() || activeSuggestion.wallet_notification_title;
            patch.wallet_notification_body = editForm.message?.trim() || activeSuggestion.wallet_notification_body;
          }
        }

        if (activeSuggestion.suggestion_type === 'reward') {
          patch.title = editForm.title?.trim() || activeSuggestion.title;
          patch.description = editForm.description?.trim() || activeSuggestion.description;
          if (editForm.recommended_threshold !== '' && editForm.recommended_threshold != null) {
            patch.recommended_threshold = Number(editForm.recommended_threshold)
              || activeSuggestion.recommended_threshold;
          }
        }

        if (activeSuggestion.suggestion_type === 'threshold') {
          patch.recommended_threshold = Number(editForm.recommended_threshold) || activeSuggestion.recommended_threshold;
          patch.description = editForm.description?.trim() || activeSuggestion.description;
        }

        await updateSuggestionFields(activeSuggestion.id, patch);
        invalidateSuggestions();
        toast.success('Idée modifiée');
        setModalOpen(false);
      } catch (error) {
        toast.error(error?.message || 'Modification impossible');
      } finally {
        setActionId(null);
      }
      return;
    }

    setActionId(activeSuggestion?.id || activeCalendarItem?.id);
    applyMutation.mutate({
      suggestion: activeSuggestion,
      calendarItem: activeCalendarItem,
      form: editForm,
    });
  };

  return {
    actionId,
    modalOpen,
    modalMode,
    activeSuggestion,
    activeCalendarItem,
    editForm,
    setEditForm,
    applyMutation,
    openModalForSuggestion,
    openModalForCalendar,
    closeModal,
    handleDiscard,
    handleCopy,
    handleModalSubmit,
  };
}
