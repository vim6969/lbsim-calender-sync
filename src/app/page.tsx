'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Upload, Calendar, CalendarPlus, Download, CheckCircle, Clock } from 'lucide-react';
import { parseExcelData, ScheduleEntry } from '@/lib/parseExcel';
import { generateICSBlob, generateGoogleCalendarUrl } from '@/lib/calendar';

export default function Home() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [isHovering, setIsHovering] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setErrorMsg('');
    setFileName(file.name);
    try {
      const data = await parseExcelData(file);
      if (data.length === 0) {
        setErrorMsg('No schedule records found. Please ensure the file has columns like Subject, Section, Day, Start Time, and End Time.');
        return;
      }

      setEntries(data);

      const uniqueSections = Array.from(new Set(data.map(d => d.section)));
      setSections(uniqueSections);

      if (uniqueSections.length > 0) {
        setSelectedSection(uniqueSections[0]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to parse the file.');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const filteredEntries = entries.filter(e => e.section === selectedSection);

  const handleDownloadIcs = () => {
    if (!filteredEntries.length) return;
    const blob = generateICSBlob(filteredEntries);
    if (!blob) {
      alert("Could not generate ICS file. Please check time formats.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Schedule_Section_${selectedSection}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGCalAdd = (entry: ScheduleEntry) => {
    const url = generateGoogleCalendarUrl(entry);
    if (url) {
      window.open(url, '_blank');
    } else {
      alert("Failed to parse times correctly.");
    }
  };

  return (
    <main className="container">
      <div className="header animate-fade-in">
        <h1>Timetable Sync</h1>
        <p>Extract your schedule from Excel and sync to directly to your calendar.</p>
      </div>

      {!entries.length ? (
        <div
          className={`glass-card file-upload-area animate-fade-in ${isHovering ? 'active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
          onDragLeave={() => setIsHovering(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h2>Upload Timetable</h2>
          <p className="mb-4">Drag and drop your .xlsx or .csv file here, or click to browse</p>
          <button className="btn btn-primary">Select File</button>
          <input
            type="file"
            ref={fileInputRef}
            className="file-input"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={onFileChange}
          />
          {errorMsg && <p style={{ color: 'var(--danger)', marginTop: '1rem', fontWeight: 600 }}>{errorMsg}</p>}
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="glass-card text-center mb-4">
            <CheckCircle size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <h2>File Parsed Successfully</h2>
            <p className="mb-4">Found {entries.length} records in <strong>{fileName}</strong></p>
            <button className="btn btn-outline" onClick={() => { setEntries([]); setSections([]); }}>
              Upload a different file
            </button>
          </div>

          {sections.length > 0 && (
            <div className="glass-card mt-8">
              <h3>Select your Section</h3>
              <div className="section-list">
                {sections.map(sec => (
                  <div
                    key={sec}
                    className={`section-chip ${selectedSection === sec ? 'active' : ''}`}
                    onClick={() => setSelectedSection(sec)}
                  >
                    {sec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedSection && filteredEntries.length > 0 && (
            <div className="glass-card mt-8">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <h3>Schedule for Section: {selectedSection}</h3>
                <button className="btn btn-primary" onClick={handleDownloadIcs}>
                  <Download size={20} /> Download for Apple / Outlook
                </button>
              </div>

              <div className="schedule-grid">
                {filteredEntries.map((entry, idx) => (
                  <div key={idx} className="schedule-item">
                    <div className="schedule-details">
                      <h4>{entry.subject}</h4>
                      <p className="schedule-time"><Clock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {entry.day} • {entry.startTime} - {entry.endTime}</p>
                    </div>
                    <button className="btn btn-outline" onClick={() => handleGCalAdd(entry)}>
                      <CalendarPlus size={20} /> Google Calendar
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-4" style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                * Because Google Calendar URL parameters only support one event at a time, you can add events there individually, or download the ICS file and import it all at once into Google Calendar!
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
