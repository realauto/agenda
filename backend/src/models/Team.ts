import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, 'Team name must be at least 2 characters')
    .max(50, 'Team name must be at most 50 characters'),
  description: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  settings: z
    .object({
      isPublic: z.boolean().optional(),
      allowMemberInvites: z.boolean().optional(),
      defaultProjectVisibility: z.enum(['public', 'team', 'private']).optional(),
    })
    .optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  settings: z
    .object({
      isPublic: z.boolean().optional(),
      allowMemberInvites: z.boolean().optional(),
      defaultProjectVisibility: z.enum(['public', 'team', 'private']).optional(),
    })
    .optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
