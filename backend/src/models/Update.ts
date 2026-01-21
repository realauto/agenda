import { z } from 'zod';

export const createUpdateSchema = z.object({
  projectId: z.string().length(24, 'Invalid project ID'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be at most 5000 characters'),
  category: z
    .enum(['progress', 'blocker', 'bug', 'feature', 'milestone', 'general'])
    .optional()
    .default('general'),
  mood: z.enum(['positive', 'neutral', 'negative', 'urgent']).optional().default('neutral'),
  attachments: z
    .array(
      z.object({
        type: z.enum(['image', 'file', 'link']),
        url: z.string().url(),
        name: z.string().max(255),
        thumbnail: z.string().url().optional(),
      })
    )
    .max(10)
    .optional(),
});

export const updateUpdateSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  category: z.enum(['progress', 'blocker', 'bug', 'feature', 'milestone', 'general']).optional(),
  mood: z.enum(['positive', 'neutral', 'negative', 'urgent']).optional(),
  attachments: z
    .array(
      z.object({
        type: z.enum(['image', 'file', 'link']),
        url: z.string().url(),
        name: z.string().max(255),
        thumbnail: z.string().url().optional(),
      })
    )
    .max(10)
    .optional(),
});

export const addReactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export const feedQuerySchema = z.object({
  cursor: z.string().length(24).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  category: z.enum(['progress', 'blocker', 'bug', 'feature', 'milestone', 'general']).optional(),
});

export type CreateUpdateInput = z.infer<typeof createUpdateSchema>;
export type UpdateUpdateInput = z.infer<typeof updateUpdateSchema>;
export type AddReactionInput = z.infer<typeof addReactionSchema>;
export type FeedQueryInput = z.infer<typeof feedQuerySchema>;
