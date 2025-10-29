import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
} from 'docx';

/** מחזיר Buffer של DOCX מוכן לכתיבה לדיסק/החזרה מה-API */
export async function buildDocxBuffer(title: string, lines: string[], date?: string): Promise<Buffer> {
  const dateLine = date ?? new Date().toLocaleString('he-IL');

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.RIGHT }],
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            bidirectional: true,
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            bidirectional: true,
            alignment: AlignmentType.RIGHT,
            children: [new TextRun(`נוצר: ${dateLine}`)],
          }),
          ...lines.map(
            (l) =>
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.RIGHT,
                numbering: { reference: 'bullets', level: 0 },
                children: [new TextRun(l)],
              })
          ),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
