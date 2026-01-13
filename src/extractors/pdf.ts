import {exec} from 'child_process';
import {promisify} from 'util';

const execAsync = promisify(exec);

export async function extractPdfText(pdfPath: string): Promise<string> {
	try {
		// Use pdftotext from poppler-utils
		// -layout preserves the original physical layout
		// - outputs to stdout
		const {stdout} = await execAsync(`pdftotext -layout "${pdfPath}" -`, {
			maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large PDFs
		});
		return stdout;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to extract PDF text: ${error.message}`);
		}
		throw error;
	}
}
