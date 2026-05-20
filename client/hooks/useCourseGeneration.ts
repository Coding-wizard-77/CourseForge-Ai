"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGeminiKey } from "@/components/settings/gemini-key-provider";
import { createCourse, demoUserId } from "@/services/api";

export function useCourseGeneration(userId = demoUserId) {
  const queryClient = useQueryClient();
  const { apiKey } = useGeminiKey();

  return useMutation({
    mutationFn: (topic: string) => createCourse(topic, userId, apiKey || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses", userId] });
    }
  });
}
