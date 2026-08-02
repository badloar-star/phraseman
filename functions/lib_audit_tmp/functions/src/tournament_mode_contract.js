"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OWNER_APPROVED_TOURNAMENT_MODES = void 0;
exports.isOwnerApprovedTournamentMode = isOwnerApprovedTournamentMode;
/**
 * Owner-approved modes for every newly assembled tournament room.
 *
 * Stored legacy tasks are intentionally left untouched for audit/history and
 * for already-running rooms, but no planner, publisher or selector may treat
 * them as eligible for a new room.
 */
exports.OWNER_APPROVED_TOURNAMENT_MODES = Object.freeze([
    'guess_phrase',
    'fill_gap',
    'find_oddity',
    'translate_build',
    'speed_match',
]);
function isOwnerApprovedTournamentMode(value) {
    return typeof value === 'string'
        && exports.OWNER_APPROVED_TOURNAMENT_MODES.includes(value);
}
//# sourceMappingURL=tournament_mode_contract.js.map