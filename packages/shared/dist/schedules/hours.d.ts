/** Several clock hours become one cron, because each queue accepts a single schedule. */
export declare function cronFromHours(hours: number[]): string;
/** Returns the hours of a top-of-the-hour daily cron, or null when it is a custom expression. */
export declare function hoursFromCron(cron: string): number[] | null;
//# sourceMappingURL=hours.d.ts.map