import * as ics from 'ics';
import { nextDay, Day } from 'date-fns';
import { ScheduleEntry } from './parseExcel';

const dayMap: Record<string, Day> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6
};

function getTargetDay(dayStr: string): Day | undefined {
    const normalized = dayStr.toLowerCase().trim();
    for (const [key, val] of Object.entries(dayMap)) {
        if (normalized.includes(key)) {
            return val;
        }
    }
    return undefined;
}

function parseTime(timeStr: string): { hours: number; minutes: number } | null {
    const match = timeStr.trim().match(/(\d{1,2})[\.:]?(\d{0,2})\s*(am|pm|a|p)?/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const modifier = match[3]?.toLowerCase() || '';

    if (modifier.includes('p') && hours < 12) {
        hours += 12;
    }
    if (modifier.includes('a') && hours === 12) {
        hours = 0;
    }

    // Heuristic: typical times between 1:00 and 7:59 in schedules are PM. 
    // This catches "4:00 - 5:30", "6:00 - 7:30", "2:00 - 3:30", etc.
    if (!modifier && hours >= 1 && hours <= 7) {
        hours += 12;
    }

    return { hours, minutes };
}

export function generateICSBlob(entries: ScheduleEntry[]): Blob | null {
    const events: ics.EventAttributes[] = [];
    const now = new Date();

    for (const entry of entries) {
        const dayStr = entry.day;
        const targetDay = getTargetDay(dayStr);

        // Fallback if day is unrecognizable - we fallback to today but preferably we ignore it
        const occurrence = targetDay !== undefined ? nextDay(now, targetDay) : now;

        const startParse = parseTime(entry.startTime);
        const endParse = parseTime(entry.endTime);

        if (!startParse || !endParse) {
            console.warn(`Skipping event due to bad time format: ${entry.startTime} - ${entry.endTime}`);
            continue;
        }

        events.push({
            start: [
                occurrence.getFullYear(),
                occurrence.getMonth() + 1,
                occurrence.getDate(),
                startParse.hours,
                startParse.minutes
            ],
            end: [
                occurrence.getFullYear(),
                occurrence.getMonth() + 1,
                occurrence.getDate(),
                endParse.hours,
                endParse.minutes
            ],
            title: `${entry.subject} (Section ${entry.section})`,
            description: `Class scheduled for section ${entry.section}`,
            recurrenceRule: `FREQ=WEEKLY;INTERVAL=1;COUNT=15`,
        });
    }

    if (events.length === 0) return null;

    const { error, value } = ics.createEvents(events);

    if (error || !value) {
        console.error(error);
        return null;
    }

    return new Blob([value], { type: 'text/calendar;charset=utf-8' });
}

export function generateGoogleCalendarUrl(entry: ScheduleEntry): string | null {
    const now = new Date();
    const dayStr = entry.day;
    const targetDay = getTargetDay(dayStr);
    const occurrence = targetDay !== undefined ? nextDay(now, targetDay) : now;

    const startParse = parseTime(entry.startTime);
    const endParse = parseTime(entry.endTime);

    if (!startParse || !endParse) return null;

    const startD = new Date(occurrence);
    startD.setHours(startParse.hours, startParse.minutes, 0);

    const endD = new Date(occurrence);
    endD.setHours(endParse.hours, endParse.minutes, 0);

    const formatGcalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

    const details = encodeURIComponent(`Section ${entry.section}`);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(entry.subject)}&dates=${formatGcalDate(startD)}/${formatGcalDate(endD)}&details=${details}&recur=RRULE:FREQ=WEEKLY;COUNT=15`;

    return url;
}
