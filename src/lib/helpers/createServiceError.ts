export default function createServiceError(serviceName: string, error: Error) {
	console.error(error);
	return new Error(`Service ${serviceName} failed with error: ${error.message}`);
}
