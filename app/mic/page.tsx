'use client';
import { useState } from 'react';
export default function MicTest() {
  const [msg, setMsg] = useState('לחץ "בקש הרשאה"');
  async function ask() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMsg('✅ קיבלת הרשאה למיקרופון');
    } catch (e:any) {
      setMsg('❌ שגיאה: ' + (e?.name || e?.message || e));
    }
  }
  return (<div dir="rtl" style={{padding:20}}>
    <h1>בדיקת מיקרופון</h1>
    <button onClick={ask}>בקש הרשאה</button>
    <pre>{msg}</pre>
  </div>);
}
