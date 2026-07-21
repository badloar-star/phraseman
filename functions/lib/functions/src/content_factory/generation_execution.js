"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerationPersistenceError = void 0;
exports.canCommitGenerationExecution = canCommitGenerationExecution;
exports.generationPersistenceError = generationPersistenceError;
exports.runGuardedGenerationTransaction = runGuardedGenerationTransaction;
const https_1 = require("firebase-functions/v2/https");
function canCommitGenerationExecution(current, lease, allowedStates) {
    return allowedStates.includes(String(current.state ?? ''))
        && Number(current.attempts) === lease.attempt
        && current.leaseToken === lease.leaseToken;
}
class GenerationPersistenceError extends https_1.HttpsError {
    constructor(cause) {
        super('internal', 'generation_terminal_persistence_failed');
        this.cause = cause;
    }
}
exports.GenerationPersistenceError = GenerationPersistenceError;
function generationPersistenceError(cause) {
    return new GenerationPersistenceError(cause);
}
async function runGuardedGenerationTransaction(input) {
    try {
        return await input.runTransaction(async (transaction) => {
            const loaded = await input.read(transaction);
            if (!loaded.current || !canCommitGenerationExecution(loaded.current, input.lease, input.allowedStates))
                return false;
            await input.commit(transaction, loaded.current, loaded.context);
            return true;
        });
    }
    catch (cause) {
        throw generationPersistenceError(cause);
    }
}
//# sourceMappingURL=generation_execution.js.map