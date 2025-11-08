import { renameRecording } from "../utils/api";

export default function RenameButton({ name, onDone }) {
  const onClick = async () => {
    const current = name.endsWith(".webm") ? name : `${name}.webm`;
    const base = current.replace(/\.webm$/i, "");
    const input = prompt("שם חדש להקלטה (ללא סיומת):", base);
    if (!input) return;

    const newName = input.endsWith(".webm") ? input : `${input}.webm`;
    try {
      await renameRecording(current, newName);
      alert("עודכן בהצלחה");
      onDone?.(newName);
    } catch (e) {
      alert("נכשל שינוי השם: " + (e?.message || "unknown"));
    }
  };

  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-lg border text-sm hover:bg-gray-50"
      title="שנה שם"
    >
      שינוי שם
    </button>
  );
}
