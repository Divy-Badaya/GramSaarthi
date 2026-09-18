"""
GRAMSAARTHI — DPR PDF Generation Service
Generates an official, bank-ready Detailed Project Report (DPR) PDF
using ReportLab. Single source of truth: reuses the exact structured DPR data.
"""

import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and draw 'Page X of Y' in footer."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#556987"))

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, 800, "GRAMSAARTHI — Detailed Project Report (DPR)")
            self.drawRightString(555, 800, "Confidential Bank Submission")
            self.setStrokeColor(colors.HexColor("#D1D5DB"))
            self.setLineWidth(0.5)
            self.line(40, 794, 555, 794)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#D1D5DB"))
        self.setLineWidth(0.5)
        self.line(40, 45, 555, 45)

        self.drawString(40, 32, "Empowering Rural Entrepreneurs · www.gramsaarthi.in")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(555, 32, page_str)
        self.restoreState()


def generate_dpr_pdf_buffer(dpr_data: dict) -> io.BytesIO:
    """
    Produce a clean, branded PDF byte stream from structured DPR data.
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    primary_color = colors.HexColor("#0D2C54")    # Deep Navy
    orange_color = colors.HexColor("#E06D14")     # GramSaarthi Amber/Orange
    text_dark = colors.HexColor("#1F2937")
    text_muted = colors.HexColor("#4B5563")

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=orange_color,
        spaceAfter=12,
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "BodyTextCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=text_dark,
        spaceAfter=6,
    )

    cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=text_dark,
    )

    cell_header_style = ParagraphStyle(
        "TableCellHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    story = []

    # ── 1. Document Header & Branding ──────────────────────────────────────────
    biz_name = dpr_data.get("business_name") or dpr_data.get("business_type") or "Rural Enterprise"
    biz_type = dpr_data.get("business_type", "Enterprise")
    promoter_info = dpr_data.get("promoter_summary", {})
    promoter_name = promoter_info.get("name", "Rural Entrepreneur")
    village = promoter_info.get("village", "")
    district = promoter_info.get("district", "")
    state = promoter_info.get("state", "")
    location_str = ", ".join(filter(None, [village, district, state])) or "India"

    fin = dpr_data.get("financial_summary", {})
    cost = fin.get("project_cost", 0)
    loan = fin.get("loan_amount", 0)
    margin = fin.get("user_capital", 0)
    emi = fin.get("emi", 0)
    subsidy = fin.get("subsidy_amount", 0)
    scheme_name = dpr_data.get("scheme_summary", {}).get("scheme_name", "PM Mudra Yojana")

    story.append(Paragraph("GRAMSAARTHI", subtitle_style))
    story.append(Paragraph(f"DETAILED PROJECT REPORT (DPR)", title_style))
    story.append(Paragraph(f"<b>Proposed Project:</b> {biz_name} ({biz_type}) &nbsp;|&nbsp; <b>Location:</b> {location_str}", body_style))
    story.append(Paragraph(f"<b>Promoter:</b> {promoter_name} &nbsp;|&nbsp; <b>Scheme:</b> {scheme_name}", body_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=12))

    # ── 2. Key Project Indicators Banner Table ────────────────────────────────
    kpi_data = [
        [
            Paragraph("<b>Total Project Cost</b>", cell_header_style),
            Paragraph("<b>Promoter Equity</b>", cell_header_style),
            Paragraph("<b>Bank Term Loan</b>", cell_header_style),
            Paragraph("<b>Monthly EMI</b>", cell_header_style),
            Paragraph("<b>Net Monthly Profit</b>", cell_header_style),
            Paragraph("<b>DSCR</b>", cell_header_style),
        ],
        [
            Paragraph(f"<b>₹{cost:,}</b>", cell_style),
            Paragraph(f"₹{margin:,}", cell_style),
            Paragraph(f"<b>₹{loan:,}</b>", cell_style),
            Paragraph(f"₹{emi:,}", cell_style),
            Paragraph(f"<b>₹{fin.get('monthly_profit', 0):,}</b>", cell_style),
            Paragraph(f"<b>{fin.get('dscr', 1.35):.2f}x</b>", cell_style),
        ],
    ]
    kpi_table = Table(kpi_data, colWidths=[85, 85, 85, 85, 95, 80])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), primary_color),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#F8FAFC")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 14))

    # ── 3. Render All Structured Sections ──────────────────────────────────────
    sections = dpr_data.get("sections", [])
    for sec in sections:
        sec_title = sec.get("title", "")
        sec_content = sec.get("content", "")
        sec_table = sec.get("table")

        story.append(Paragraph(sec_title, section_heading))

        # Format paragraphs
        paras = sec_content.split("\n\n")
        for p in paras:
            p_clean = p.strip().replace("\n", "<br/>")
            if p_clean:
                story.append(Paragraph(p_clean, body_style))

        # Render associated data table if present
        if sec_table and isinstance(sec_table, list) and len(sec_table) > 0:
            headers = list(sec_table[0].keys())
            table_rows = [[Paragraph(f"<b>{h}</b>", cell_header_style) for h in headers]]
            for row_dict in sec_table:
                row_cells = [Paragraph(str(row_dict.get(h, "")), cell_style) for h in headers]
                table_rows.append(row_cells)

            # Distribute column widths across printable width ~515pt
            col_w = 515.0 / max(1, len(headers))
            col_widths = [col_w] * len(headers)

            t_elem = Table(table_rows, colWidths=col_widths)
            t_elem.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), primary_color),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(Spacer(1, 4))
            story.append(t_elem)

        story.append(Spacer(1, 10))

    # ── 4. Signatures & Declaration Block ─────────────────────────────────────
    story.append(KeepTogether([
        Spacer(1, 16),
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=4, spaceAfter=14),
        Paragraph("<b>PROMOTER DECLARATION & SIGNATURE</b>", section_heading),
        Paragraph(
            "I hereby declare that all particulars, financial estimates, and personal statements made in this "
            "Detailed Project Report are true and correct to the best of my knowledge. I understand that bank credit "
            "is sanctioned based on these representations and agree to comply with all bank and government scheme guidelines.",
            body_style,
        ),
        Spacer(1, 36),
        Table(
            [
                [
                    Paragraph(f"<b>Signature of Promoter:</b> ____________________<br/><b>Name:</b> {promoter_name}<br/><b>Date:</b> {datetime.now().strftime('%d-%b-%Y')}", body_style),
                    Paragraph("<b>Verified by Lending Officer / GramSaarthi:</b><br/>Seal & Signature: ____________________<br/>Date: ____________________", body_style),
                ]
            ],
            colWidths=[260, 255],
        ),
        Spacer(1, 14),
    ]))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer
