export interface Job {
	name: string;
	description: string;
	handler: () => Promise<void>;
}
