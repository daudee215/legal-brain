# Eyeball an Urdu PDF (manual check, not run by CI)

Unit tests (`tests/unit/pdfUrdu.test.ts`) use a fake renderer because jsdom has no canvas. They prove that Urdu
strings go to the renderer and never to pdf-lib's `drawText`, but not that the Nastaliq looks right. Check that by eye.

1. `npm run dev` and open http://localhost:3000/app/cases/k1/ (any case works).
2. **Case status**: next to **Status PDF**, click the small arrow and pick **اردو**. Open the downloaded
   `Case status - … (Urdu).pdf`. Check:
   - the title, labels and footer are joined Nastaliq (not separate letters, no boxes, no "?");
   - labels sit on the right and values are right-aligned; English values (case no., court) read normally;
   - "24 نومبر 2026، 09:00 قبل دوپہر" reads right-to-left with the numbers in the right order;
   - the hearings table runs right-to-left (تاریخ | کارروائی | اگلی تاریخ) and repeats its header on page 2;
   - "صفحہ 1 از N" at the bottom.
3. **Fee receipt**: open the **Fees** tab, use the arrow beside **Receipt** and try **اردو** and **Both**:
   - Urdu: "… سے مبلغ 75,000 روپے (پچھتر ہزار روپے صرف) بطور فیسِ وکالت …" starts at the right, even when the
     client's name is in English; signature line on the left; amount in words is correct.
   - Both: every English label has its Urdu label under it; the English sentence comes first, then the Urdu one.
4. **Urdu data in English PDFs**: edit a client's name (or a case title / hearing note) to Urdu, e.g. `محمد عثمان`,
   then download the English receipt, status PDF, **Hearing prep sheet** and the monthly report (Tools). The Urdu
   should print as Nastaliq, not "????".
5. Zoom the PDF to 300% or print it: the Urdu is a 3x picture, so it should stay sharp. It is not selectable or
   searchable text (expected).
6. Offline / blocked Google Fonts: the PDF still builds after about 6 seconds, using a system Urdu font
   (e.g. "Urdu Typesetting" on Windows) instead of Noto Nastaliq Urdu.
