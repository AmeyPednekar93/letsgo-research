// Generates a minimal DOCX file from scratch using raw XML (no SDK needed)
function generateDocx(participantName, date, transcript, synthesis) {
  const esc = (t) => (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

  const para = (text, bold = false, size = 22, color = "000000", spaceAfter = 120) =>
    `<w:p><w:pPr><w:spacing w:after="${spaceAfter}"/></w:pPr><w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:sz w:val="${size}"/><w:color w:val="${color}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;

  const heading = (text, color = "1A3A5C") => para(text, true, 28, color, 160);
  const subheading = (text) => para(text, true, 24, "0E7490", 120);
  const field = (label, value) => value
    ? `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="64748B"/></w:rPr><w:t>${esc(label)}: </w:t></w:r><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${esc(value)}</w:t></w:r></w:p>`
    : "";
  const divider = () => `<w:p><w:pPr><w:spacing w:after="160"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="E2E8F0"/></w:pBdr></w:pPr><w:r><w:t></w:t></w:r></w:p>`;
  const spacer = () => `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:t></w:t></w:r></w:p>`;
  const bubble = (m, pName) => {
    const isUser = m.role === "user";
    const speaker = isUser ? pName.toUpperCase() : "INTERVIEWER";
    const color = isUser ? "2563EB" : "0E7490";
    const lines = (m.content || "").split("\n");
    return [
      `<w:p><w:pPr><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="${color}"/></w:rPr><w:t>${esc(speaker)}</w:t></w:r></w:p>`,
      ...lines.map(line =>
        `<w:p><w:pPr><w:spacing w:after="20"/><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${esc(line)}</w:t></w:r></w:p>`
      ),
      spacer(),
    ].join("");
  };

  const s = synthesis || {};
  const cleanTranscript = (transcript || []).filter(m => !m.isWelcome && !m.content?.startsWith("(The participant"));

  const bodyXml = [
    // Cover
    `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="48"/><w:color w:val="1A3A5C"/></w:rPr><w:t>Let&#x2019;s Go!</w:t></w:r></w:p>`,
    para("Research Interview Report", true, 28, "0E7490", 80),
    para(`Participant: ${participantName}  ·  Date: ${date}`, false, 20, "64748B", 60),
    para(`Persona: ${s.persona_match || ""}  ·  ${s.buyer_status || ""}`, false, 20, "64748B", 200),
    divider(),

    // Synthesis
    heading("Synthesis"),
    subheading("Life Context"),
    field("Life Stage", s.life_context?.life_stage),
    field("Household", s.life_context?.household),
    field("Motivation", s.life_context?.motivation),
    field("Money Relationship", s.life_context?.money_relationship),
    field("Decision Style", s.life_context?.decision_style),
    field("Info Sources", s.life_context?.info_sources),
    spacer(),

    subheading("Car Journey"),
    field("Trigger", s.car_journey?.trigger),
    field("Biggest Confusion", s.car_journey?.biggest_confusion),
    field("What Was Missing", s.car_journey?.what_was_missing),
    field("Regret Fear", s.car_journey?.regret_fear),
    field("Cars Considering / Bought", s.car_journey?.current_shortlist || s.car_journey?.car_purchased),
    field("Timeline / Date", s.car_journey?.buying_timeline || s.car_journey?.purchase_date_approx),
    s.car_journey?.feeling_about_decision_now ? field("Feeling About Decision Now", s.car_journey.feeling_about_decision_now) : "",
    s.car_journey?.what_they_wish_existed ? field("Wish Had Existed", s.car_journey.what_they_wish_existed) : "",
    spacer(),

    subheading("Best Quotes"),
    ...(s.best_quotes || []).map((q, i) =>
      `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="22"/><w:color w:val="1A3A5C"/></w:rPr><w:t xml:space="preserve">&#x201C;${esc(q.quote)}&#x201D;</w:t></w:r></w:p>` +
      `<w:p><w:pPr><w:spacing w:after="120"/><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:sz w:val="19"/><w:color w:val="64748B"/></w:rPr><w:t xml:space="preserve">&#x2192; ${esc(q.why_it_matters)}</w:t></w:r></w:p>`
    ),
    spacer(),

    field("Biggest Surprise", s.biggest_surprise),
    field("Product Implication", s.product_implication),
    spacer(),

    s.participant_feedback?.overall_feeling ? [
      subheading("Participant Feedback"),
      field("How It Felt", s.participant_feedback.overall_feeling),
      field("What Worked", s.participant_feedback.what_worked),
      field("To Improve", s.participant_feedback.what_to_improve),
      spacer(),
    ].join("") : "",

    divider(),

    // Transcript
    heading("Full Conversation"),
    ...cleanTranscript.map(m => bubble(m, participantName)),
  ].join("");

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${bodyXml}
<w:sectPr>
  <w:pgSz w:w="12240" w:h="15840"/>
  <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/>
</w:sectPr>
</w:body>
</w:document>`;

  // Build minimal DOCX (ZIP with required XML files)
  // We use a pre-built base64 minimal DOCX structure and inject our content
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    "word/document.xml": docXml,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`,
  };

  return files;
}

// Minimal ZIP builder (no external deps)
function buildZip(files) {
  // We'll use a simple approach — encode as base64 using Buffer
  // Since we can't use JSZip without npm, we build the ZIP manually
  const parts = [];

  function crc32(str) {
    const buf = Buffer.from(str, 'utf8');
    let crc = 0xFFFFFFFF;
    for (const byte of buf) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function uint16LE(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
  function uint32LE(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; }

  const centralDir = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf8');
    const dataBuf = Buffer.from(content, 'utf8');
    const crc = crc32(content);
    const size = dataBuf.length;

    // Local file header
    const localHeader = Buffer.concat([
      Buffer.from([0x50,0x4B,0x03,0x04]), // signature
      uint16LE(20),   // version needed
      uint16LE(0),    // flags
      uint16LE(0),    // compression (stored)
      uint16LE(0),    // mod time
      uint16LE(0),    // mod date
      uint32LE(crc),
      uint32LE(size), // compressed size
      uint32LE(size), // uncompressed size
      uint16LE(nameBuf.length),
      uint16LE(0),    // extra field length
      nameBuf,
    ]);

    const centralEntry = Buffer.concat([
      Buffer.from([0x50,0x4B,0x01,0x02]), // signature
      uint16LE(20),   // version made by
      uint16LE(20),   // version needed
      uint16LE(0),    // flags
      uint16LE(0),    // compression
      uint16LE(0),    // mod time
      uint16LE(0),    // mod date
      uint32LE(crc),
      uint32LE(size),
      uint32LE(size),
      uint16LE(nameBuf.length),
      uint16LE(0),    // extra
      uint16LE(0),    // comment
      uint16LE(0),    // disk start
      uint16LE(0),    // internal attr
      uint32LE(0),    // external attr
      uint32LE(offset),
      nameBuf,
    ]);

    parts.push(localHeader, dataBuf);
    centralDir.push(centralEntry);
    offset += localHeader.length + dataBuf.length;
  }

  const centralDirBuf = Buffer.concat(centralDir);
  const eocd = Buffer.concat([
    Buffer.from([0x50,0x4B,0x05,0x06]), // end of central dir signature
    uint16LE(0),    // disk number
    uint16LE(0),    // disk with central dir
    uint16LE(centralDir.length),
    uint16LE(centralDir.length),
    uint32LE(centralDirBuf.length),
    uint32LE(offset),
    uint16LE(0),    // comment length
  ]);

  return Buffer.concat([...parts, centralDirBuf, eocd]);
}

// HTML email body
function generateEmailHtml(participantName, date, synthesis) {
  const s = synthesis || {};
  const esc = (t) => (t || "—").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const field = (label, val, color = "#0E7490") => val && val !== "—" ? `
    <tr><td style="padding:6px 12px;font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;vertical-align:top">${label}</td>
    <td style="padding:6px 12px;font-size:13px;color:#0F172A;line-height:1.6">${esc(val)}</td></tr>` : "";

  const highlight = (label, val, color) => `
    <td style="width:33%;padding:16px;background:white;border-radius:10px;border-top:3px solid ${color};vertical-align:top">
      <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px">${label}</div>
      <div style="font-size:13px;color:#0F172A;line-height:1.6">${esc(val)}</div>
    </td>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#F8FAFC;font-family:system-ui,sans-serif">
<div style="max-width:680px;margin:0 auto">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1A3A5C,#0E7490);padding:32px 40px;border-radius:0 0 0 0">
    <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:white">Let&#x2019;s <span style="color:#60A5FA">Go!</span></div>
    <div style="font-size:12px;color:#93C5FD;text-transform:uppercase;letter-spacing:1px;margin-top:8px">Research Session Report</div>
    <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:white;margin-top:6px">${esc(participantName)}</div>
    <div style="font-size:12px;color:#94A3B8;margin-top:4px">${date}</div>
  </div>

  <!-- Badges -->
  <div style="background:#1A3A5C;padding:12px 40px;display:flex;gap:8px">
    ${s.persona_match ? `<span style="background:rgba(255,255,255,0.15);color:white;padding:3px 12px;border-radius:99px;font-size:11px;font-weight:700;text-transform:uppercase">${esc(s.persona_match)}</span>` : ""}
    ${s.buyer_status ? `<span style="background:rgba(110,231,183,0.2);color:#6EE7B7;padding:3px 12px;border-radius:99px;font-size:11px;font-weight:700;text-transform:uppercase">${esc(s.buyer_status)}</span>` : ""}
    ${s.three_word_description ? `<span style="background:rgba(147,197,253,0.15);color:#93C5FD;padding:3px 12px;border-radius:99px;font-size:11px;font-weight:700;text-transform:uppercase">${esc(s.three_word_description)}</span>` : ""}
  </div>

  <div style="padding:24px 24px 0">
    <!-- Key signals -->
    <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom:20px"><tr>
      ${highlight("Biggest Confusion", s.car_journey?.biggest_confusion, "#DC2626")}
      <td width="2%"></td>
      ${highlight("Regret Fear", s.car_journey?.regret_fear, "#D97706")}
      <td width="2%"></td>
      ${highlight("What Was Missing", s.car_journey?.what_was_missing, "#0E7490")}
    </tr></table>

    <!-- Life context -->
    <div style="background:white;border-radius:10px;padding:20px;margin-bottom:16px;border:1px solid #E2E8F0">
      <div style="font-size:11px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px">Life Context</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${field("Life stage", s.life_context?.life_stage, "#2563EB")}
        ${field("Household", s.life_context?.household, "#2563EB")}
        ${field("Motivation", s.life_context?.motivation, "#2563EB")}
        ${field("Money relationship", s.life_context?.money_relationship, "#2563EB")}
        ${field("Decision style", s.life_context?.decision_style, "#2563EB")}
        ${field("Info sources", s.life_context?.info_sources, "#2563EB")}
      </table>
    </div>

    <!-- Car journey -->
    <div style="background:white;border-radius:10px;padding:20px;margin-bottom:16px;border:1px solid #E2E8F0">
      <div style="font-size:11px;font-weight:700;color:#0E7490;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px">Car Journey</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${field("Trigger", s.car_journey?.trigger)}
        ${field("Cars / Bought", s.car_journey?.current_shortlist || s.car_journey?.car_purchased)}
        ${field("Timeline", s.car_journey?.buying_timeline || s.car_journey?.purchase_date_approx)}
        ${field("Confidence trigger", s.car_journey?.confidence_trigger || s.car_journey?.what_made_them_decide)}
        ${s.car_journey?.feeling_about_decision_now ? field("Feeling now", s.car_journey.feeling_about_decision_now) : ""}
        ${s.car_journey?.what_they_wish_existed ? field("Wish existed", s.car_journey.what_they_wish_existed) : ""}
      </table>
    </div>

    <!-- Quotes -->
    ${(s.best_quotes || []).length > 0 ? `
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:#1A3A5C;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px">Best Quotes</div>
      ${(s.best_quotes || []).map((q, i) => {
        const colors = ["#2563EB","#0E7490","#D97706"];
        return `<div style="background:white;border-radius:10px;padding:16px;margin-bottom:8px;border:1px solid #E2E8F0;border-left:4px solid ${colors[i%3]}">
          <div style="font-size:14px;font-style:italic;color:#1A3A5C;line-height:1.7;margin-bottom:6px">&#x201C;${esc(q.quote)}&#x201D;</div>
          <div style="font-size:12px;color:#64748B">&#x2192; ${esc(q.why_it_matters)}</div>
        </div>`;
      }).join("")}
    </div>` : ""}

    <!-- Confirmed / Updated -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px"><tr>
      <td style="width:49%;background:#F0FDF4;border-radius:10px;padding:16px;border:1px solid #BBF7D0;vertical-align:top">
        <div style="font-size:11px;font-weight:700;color:#15803D;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px">Persona Confirmed</div>
        ${(s.persona_confirmed || []).map(c => `<div style="font-size:13px;color:#0F172A;margin-bottom:5px">&#x2713; ${esc(c)}</div>`).join("")}
      </td>
      <td width="2%"></td>
      <td style="width:49%;background:#FFFBEB;border-radius:10px;padding:16px;border:1px solid #FDE68A;vertical-align:top">
        <div style="font-size:11px;font-weight:700;color:#D97706;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px">Updated / New Insight</div>
        ${(s.persona_updated || []).map(u => `<div style="font-size:13px;color:#0F172A;margin-bottom:5px">&#x2192; ${esc(u)}</div>`).join("")}
      </td>
    </tr></table>

    <!-- Surprise + Implication -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px"><tr>
      ${s.biggest_surprise ? `<td style="width:49%;background:#EFF6FF;border-radius:10px;padding:16px;border:1px solid #BFDBFE;vertical-align:top">
        <div style="font-size:11px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">Biggest Surprise</div>
        <div style="font-size:13px;color:#0F172A;line-height:1.6">${esc(s.biggest_surprise)}</div>
      </td>` : "<td></td>"}
      <td width="2%"></td>
      ${s.product_implication ? `<td style="width:49%;background:#F0FDF4;border-radius:10px;padding:16px;border:1px solid #BBF7D0;vertical-align:top">
        <div style="font-size:11px;font-weight:700;color:#15803D;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">Product Implication</div>
        <div style="font-size:13px;color:#0F172A;line-height:1.6">${esc(s.product_implication)}</div>
      </td>` : "<td></td>"}
    </tr></table>

    <!-- Feedback -->
    ${s.participant_feedback?.overall_feeling ? `
    <div style="background:#F5F3FF;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #DDD6FE">
      <div style="font-size:11px;font-weight:700;color:#6D28D9;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">Participant Feedback</div>
      <div style="font-size:13px;color:#0F172A;line-height:1.6;margin-bottom:6px">${esc(s.participant_feedback.overall_feeling)}</div>
      ${s.participant_feedback.what_to_improve ? `<div style="font-size:12px;color:#64748B">To improve: ${esc(s.participant_feedback.what_to_improve)}</div>` : ""}
    </div>` : ""}

    <!-- Footer -->
    <div style="text-align:center;padding:20px;font-size:11px;color:#94A3B8;border-top:1px solid #E2E8F0;margin-top:8px">
      Let&#x2019;s Go! Research &nbsp;&#xB7;&nbsp; ${esc(participantName)} &nbsp;&#xB7;&nbsp; ${date} &nbsp;&#xB7;&nbsp; Confidential
    </div>
  </div>
</div>
</body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(500).json({ error: 'Email not configured — RESEND_API_KEY missing' });
  }

  const { synthesis, transcript, participantName } = req.body;
  const date = new Date().toLocaleDateString("en-IN");
  const pName = synthesis?.participant_name || participantName || "Participant";
  const slug = pName.replace(/\s+/g, "-").toLowerCase();

  // Generate DOCX
  const docxFiles = generateDocx(pName, date, transcript || [], synthesis);
  const docxBuffer = buildZip(docxFiles);
  const docxBase64 = docxBuffer.toString('base64');

  // Generate HTML email
  const htmlBody = generateEmailHtml(pName, date, synthesis);

  // Send via Resend
  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "Let's Go! Research <onboarding@resend.dev>",
        to: ["amey.pednekar93@gmail.com"],
        subject: `Let's Go! Research — ${pName} (${date})`,
        html: htmlBody,
        attachments: [
          {
            filename: `letsgo-${slug}-transcript.docx`,
            content: docxBase64,
          }
        ]
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      console.error('Resend error:', emailData);
      return res.status(500).json({ error: emailData.message || 'Email send failed' });
    }

    return res.status(200).json({ ok: true, emailId: emailData.id });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: err.message });
  }
}
