import z from 'zod';

export const TaskSchema = z.object({
	command: z.string(),
	args: z.string().array(),
});
export type Task = z.infer<typeof TaskSchema>;

export const TasksConfigSchema = z.object({
	tasks: TaskSchema.array(),
});
export type TasksConfig = z.infer<typeof TasksConfigSchema>;
