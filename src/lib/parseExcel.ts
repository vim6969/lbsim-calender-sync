import * as XLSX from 'xlsx';

export interface ScheduleEntry {
    subject: string;
    section: string;
    day: string;
    startTime: string;
    endTime: string;
}

export async function parseExcelData(file: File): Promise<ScheduleEntry[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const schedule: ScheduleEntry[] = [];
                const merges = worksheet['!merges'] || [];
                const rangeStr = worksheet['!ref'];

                if (!rangeStr) {
                    resolve([]);
                    return;
                }

                const range = XLSX.utils.decode_range(rangeStr);
                const rows: string[][] = [];

                for (let r = range.s.r; r <= range.e.r; ++r) {
                    const row: string[] = [];
                    for (let c = range.s.c; c <= range.e.c; ++c) {
                        let targetCell = { r, c };

                        const merge = merges.find(m => r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c);
                        if (merge) {
                            targetCell = merge.s;
                        }

                        const cellAddress = XLSX.utils.encode_cell(targetCell);
                        const cell = worksheet[cellAddress];
                        row.push(cell ? String(cell.w || cell.v || "").trim() : "");
                    }
                    rows.push(row);
                }

                let currentDay = "";
                let currentTimeSlots: string[] = [];

                for (let r = 0; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || row.length === 0) continue;

                    const col0 = row[0];
                    const daysOfWeek = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
                    if (col0 && daysOfWeek.some(d => col0.toLowerCase().includes(d))) {
                        currentDay = col0;
                    }

                    const isTimeRow = row.some(val => {
                        return /\b\d{1,2}(:\d{2})?\s*(am|pm)?\s*-\s*\d{1,2}(:\d{2})?\s*(am|pm)?\b/i.test(val);
                    });

                    if (isTimeRow) {
                        currentTimeSlots = [...row];
                        continue;
                    }

                    const section = row[1];
                    // We assume any row with a non-empty section (like G1, D) that doesn't just read "Section" or "Room No"
                    if (section && section !== "" && !section.toLowerCase().includes("room") && section.length < 15) {
                        for (let c = 2; c < row.length; c++) {
                            const subject = row[c];
                            const timeSlot = currentTimeSlots[c] || "";

                            if (subject && subject !== "-" && timeSlot) {
                                const timeParts = timeSlot.split('-').map(s => s.trim());
                                let startTime = timeParts[0];
                                let endTime = timeParts[1] || timeParts[0];

                                if (!startTime) continue;

                                schedule.push({
                                    subject,
                                    section,
                                    day: currentDay || "Unknown",
                                    startTime,
                                    endTime
                                });
                            }
                        }
                    }
                }

                resolve(schedule);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
}
