import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name must be at most 100 characters'),
  description: z.string().max(1000).optional(),
  visibility: z.enum(['public', 'private', 'collaborators']).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
  visibility: z.enum(['public', 'private', 'collaborators']).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

export const inviteCollaboratorSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['editor', 'viewer']).optional().default('editor'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type InviteCollaboratorInput = z.infer<typeof inviteCollaboratorSchema>;
