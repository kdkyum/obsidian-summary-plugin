import { spawn } from 'child_process';
import type { CliProvider } from './settings';

export async function callLLM(
    cliProvider: CliProvider,
    model: string,
    systemPrompt: string,
    content: string
): Promise<string> {
    if (cliProvider === 'claude') {
        return callClaude(model, systemPrompt, content);
    } else {
        return callGemini(model, systemPrompt, content);
    }
}

async function callClaude(
    model: string,
    systemPrompt: string,
    content: string
): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = spawn('claude', [
            '--model', model,
            '--system-prompt', systemPrompt,
            '-p', '-'
        ]);

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += String(data);
        });

        proc.stderr.on('data', (data) => {
            stderr += String(data);
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve(stdout.trim());
            } else {
                reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
            }
        });

        proc.stdin.write(content);
        proc.stdin.end();

        proc.on('error', (err) => {
            reject(new Error(`Claude CLI failed: ${err.message}`));
        });
    });
}

async function callGemini(
    model: string,
    systemPrompt: string,
    content: string
): Promise<string> {
    return new Promise((resolve, reject) => {
        const fullPrompt = `${systemPrompt}\n\n---\n\n${content}`;
        const proc = spawn('gemini', [
            '--model', model,
            fullPrompt
        ]);

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += String(data);
        });

        proc.stderr.on('data', (data) => {
            stderr += String(data);
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve(stdout.trim());
            } else {
                reject(new Error(`Gemini CLI exited with code ${code}: ${stderr}`));
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`Gemini CLI failed: ${err.message}`));
        });
    });
}
