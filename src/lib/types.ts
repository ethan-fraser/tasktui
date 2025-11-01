import z from 'zod';

export const TaskSchema = z.object({
	command: z.string(),
	dependsOn: z.string().array().default([]),
});
export type Task = z.infer<typeof TaskSchema>;

export const TasksConfigSchema = z.object({
	tasks: z.record(z.string(), TaskSchema),
});
export type TasksConfig = z.infer<typeof TasksConfigSchema>;
