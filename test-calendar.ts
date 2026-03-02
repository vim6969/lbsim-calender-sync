import { generateGoogleCalendarUrl, generateICSBlob } from './src/lib/calendar';

const testEntries = [
    {
        subject: "Founder's day Celebration",
        section: "G1",
        day: "Mon 23rd Feb",
        startTime: "12:00",
        endTime: "4:00"
    },
    {
        subject: "Marketing ELECTIVE",
        section: "G2",
        day: "Tue 24th Feb",
        startTime: "4:00",
        endTime: "5:30"
    }
]

console.log("Testing ICS Blob:");
const blob = generateICSBlob(testEntries);
if (blob) {
    blob.text().then(text => console.log(text.substring(0, 500) + "..."));
} else {
    console.log("Blob Generation Failed.");
}

console.log("\nTesting GCal URL 1:");
console.log(generateGoogleCalendarUrl(testEntries[0]));
console.log("\nTesting GCal URL 2:");
console.log(generateGoogleCalendarUrl(testEntries[1]));
