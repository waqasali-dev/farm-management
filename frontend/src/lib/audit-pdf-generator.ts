import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Flock, UnifiedDailyRecord } from '../types/index.js';
import {
  petiTraysToEggs,
  eggsToPetiTrays,
  sumPetiTrays,
  normalizePetiTrays,
  calculateProductionPercentage,
  calculateFeedPerBirdGrams,
  calculateWaterPerBirdMl,
  calculateBirdAge,
} from './calculations.js';

export interface AuditPdfOptions {
  companyName?: string;
  subTitle?: string;
}

/**
 * Generates an official, publication-quality Daily Operational Audit Report PDF
 * modeled after official poultry farm audit ledgers (e.g. S. S. FEED MILLS (PVT) LTD).
 * Contains every single operational tab's data for that specific day.
 */
export function createDailyAuditPdf(
  flock: Flock,
  record: UnifiedDailyRecord,
  options?: AuditPdfOptions
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const companyName = options?.companyName || flock.companyName || 'S. S. FEED MILLS (PVT) LTD';
  const subTitle = options?.subTitle || 'POULTRY LAYER SHED • DAILY OPERATIONAL & PRODUCTION AUDIT REPORT';

  const date = record.date;
  const initialBirds = flock.initialBirds;
  const cumulativeMoat = record.birds?.moat ?? 0;
  const livingBirds = Math.max(0, initialBirds - cumulativeMoat);
  const moatPct = record.birds?.moatPercentage ?? 0;
  const birdAge = calculateBirdAge(date, flock.startDate);
  const calendarWeekday = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  const dayName = `Day 0${birdAge.day} (${calendarWeekday})`;

  // Feed math
  const prevFeed = record.priorBalances?.previousFeedStockBags ?? 0;
  const feedArrival = record.feed?.arrivalBags ?? 0;
  const feedUsed = record.feed?.usedBags ?? 0;
  const feedReturned = record.feed?.returnedBags ?? 0;
  const closingFeed = Math.max(0, prevFeed + feedArrival - feedUsed - feedReturned);
  const feedPerBirdGrams = calculateFeedPerBirdGrams(feedUsed, livingBirds);

  // Chips math
  const prevChips = record.priorBalances?.previousChipsStockBags ?? 0;
  const chipsArrival = record.chips?.arrivalBags ?? 0;
  const chipsUsed = record.chips?.usedBags ?? 0;
  const chipsReturned = record.chips?.returnedBags ?? 0;
  const closingChips = Math.max(0, prevChips + chipsArrival - chipsUsed - chipsReturned);

  // Trays math
  const prevPlastic = record.priorBalances?.previousPlasticStockTrays ?? 0;
  const plasticRecv = record.trays?.plasticReceived ?? 0;
  const plasticUsed = record.trays?.plasticUsed ?? 0;
  const closingPlastic = Math.max(0, prevPlastic + plasticRecv - plasticUsed);

  const prevCardboard = record.priorBalances?.previousCardboardStockTrays ?? 0;
  const cardboardRecv = record.trays?.cardboardReceived ?? 0;
  const cardboardUsed = record.trays?.cardboardUsed ?? 0;
  const cardboardWasted = record.trays?.cardboardWasted ?? 0;
  const closingCardboard = Math.max(0, prevCardboard + cardboardRecv - cardboardUsed - cardboardWasted);

  // Egg math
  const prevEggs = record.priorBalances?.previousEggStock ?? { peti: 0, trays: 0, looseEggs: 0, formatted: '0 Peti, 0 Trays' };
  const prevEggTotal = petiTraysToEggs(prevEggs.peti, prevEggs.trays) + (prevEggs.looseEggs || 0);
  const prodPeti = record.eggs?.productionPeti ?? 0;
  const prodTrays = record.eggs?.productionTrays ?? 0;
  const prodTotalEggs = petiTraysToEggs(prodPeti, prodTrays);
  const eggProdPct = calculateProductionPercentage(prodTotalEggs, livingBirds);
  const soldPeti = record.eggs?.soldPeti ?? 0;
  const soldTrays = record.eggs?.soldTrays ?? 0;
  const soldTotalEggs = petiTraysToEggs(soldPeti, soldTrays);
  const usageEggsTotal = (record.eggUsage || []).reduce(
    (sum, u) => sum + petiTraysToEggs(u.peti, u.trays),
    0
  );
  const closingEggTotal = Math.max(0, prevEggTotal + prodTotalEggs - soldTotalEggs - usageEggsTotal);
  const closingEggBreakdown = eggsToPetiTrays(closingEggTotal);

  const cumulativeEggFormatted = record.eggs?.cumulativeProductionFormatted ?? (
    record.priorBalances?.totalProducedEggsTillDate?.formatted ?? (
      sumPetiTrays([
        { peti: record.priorBalances?.priorTotalProducedEggs?.peti ?? 0, trays: record.priorBalances?.priorTotalProducedEggs?.trays ?? 0 },
        { peti: prodPeti, trays: prodTrays },
      ]).formatted
    )
  );
  const cumulativeEggEggs = record.eggs?.cumulativeProductionEggs ?? (
    record.priorBalances?.totalProducedEggsTillDate?.totalEggs ?? (
      sumPetiTrays([
        { peti: record.priorBalances?.priorTotalProducedEggs?.peti ?? 0, trays: record.priorBalances?.priorTotalProducedEggs?.trays ?? 0 },
        { peti: prodPeti, trays: prodTrays },
      ]).totalEggs
    )
  );

  // Diesel math
  const prevDiesel = record.priorBalances?.previousDieselStockLiters ?? 0;
  const dieselArrival = record.diesel?.arrivalLiters ?? 0;
  const dieselUsed = record.diesel?.usedLiters ?? 0;
  const closingDiesel = Math.max(0, prevDiesel + dieselArrival - dieselUsed);

  // Water & Meds
  const waterLiters = record.medicine?.waterLiters ?? 0;
  const waterPerBirdMl = calculateWaterPerBirdMl(waterLiters, livingBirds);

  // --- Document Header ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(companyName, 105, 12, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(subTitle, 105, 17, { align: 'center' });

  doc.setLineWidth(0.4);
  doc.line(14, 19, 196, 19);

  // Meta Subheader Table
  autoTable(doc, {
    startY: 21,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    headStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
    body: [
      [
        { content: `Flock Code: ${flock.flockCode}`, styles: { fontStyle: 'bold' } },
        `Flock Name: ${flock.name}`,
        `Placement Date: ${flock.startDate}`,
        `Initial Birds: ${initialBirds.toLocaleString()}`,
      ],
      [
        { content: `Audit Date: ${date}`, styles: { fontStyle: 'bold' } },
        `Flock Age: ${birdAge.formatted} (${dayName})`,
        `Living Birds: ${livingBirds.toLocaleString()}`,
        `Cumulative Moat: ${cumulativeMoat.toLocaleString()} (${moatPct}%)`,
      ],
    ],
  });

  let currentY = (doc as any).lastAutoTable.finalY + 3;

  // SECTION 1: Bird Population & Mortality
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    head: [[
      { content: '1. BIRD POPULATION, MORTALITY & ENVIRONMENTAL AUDIT', colSpan: 6, styles: { fillColor: [225, 225, 225], fontStyle: 'bold' } }
    ]],
    body: [
      [
        'Today\'s Mortality',
        `${record.birds?.mortality ?? 0} birds`,
        'Cumulative Moat',
        `${cumulativeMoat} birds (${moatPct}%)`,
        'Living Flock Balance',
        `${livingBirds.toLocaleString()} birds`,
      ],
      [
        'Light Duration',
        record.birds?.lightHours !== null && record.birds?.lightHours !== undefined ? `${record.birds.lightHours} hrs` : 'N/A',
        'Max / Min Temperature',
        `${record.birds?.maxTemperature ?? '--'} °C / ${record.birds?.minTemperature ?? '--'} °C`,
        'Manure Out (Today)',
        record.birds?.manureRemoved ? 'YES (CLEANED OUT)' : 'NO',
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // SECTION 2: Feed Inventory & Consumption
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    head: [[
      { content: '2. FEED INVENTORY & CONSUMPTION AUDIT (50 KG BAGS)', colSpan: 6, styles: { fillColor: [225, 225, 225], fontStyle: 'bold' } }
    ]],
    body: [
      [
        'Carried Stock (Prev Day)',
        `${prevFeed} bags (${prevFeed * 50} kg)`,
        'Arrival Today',
        `${feedArrival} bags (${feedArrival * 50} kg)`,
        'Total Received Till Now',
        `${(record.priorBalances?.totalArrivalBagsTillNow ?? 0)} bags`,
      ],
      [
        'Consumed Today',
        `${feedUsed} bags (${feedUsed * 50} kg)`,
        'Returned Today',
        `${feedReturned} bags (${feedReturned * 50} kg)`,
        'Daily Intake Rate',
        `${feedPerBirdGrams} g/bird`,
      ],
      [
        { content: 'Closing Feed Stock Balance', styles: { fontStyle: 'bold' } },
        { content: `${closingFeed} bags (${closingFeed * 50} kg)`, colSpan: 5, styles: { fontStyle: 'bold' } },
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // SECTION 3: Calcium Chips Inventory
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    head: [[
      { content: '3. CHIPS (CALCIUM SUPPLEMENT) INVENTORY AUDIT (BAGS)', colSpan: 6, styles: { fillColor: [225, 225, 225], fontStyle: 'bold' } }
    ]],
    body: [
      [
        'Carried Stock (Prev Day)',
        `${prevChips} bags`,
        'Arrival / Received Today',
        `${chipsArrival} bags`,
        'Total Received Till Now',
        `${(record.priorBalances?.totalChipsArrivalBagsTillNow ?? 0)} bags`,
      ],
      [
        'Used / Spread Today',
        `${chipsUsed} bags`,
        'Returned Today',
        `${chipsReturned} bags`,
        { content: 'Closing Chips Balance', styles: { fontStyle: 'bold' } },
        { content: `${closingChips} bags`, styles: { fontStyle: 'bold' } },
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // SECTION 4: Trays Inventory (Plastic & Cardboard)
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    head: [[
      { content: '4. TRAYS INVENTORY AUDIT (PLASTIC & CARDBOARD TRAYS)', colSpan: 6, styles: { fillColor: [225, 225, 225], fontStyle: 'bold' } }
    ]],
    body: [
      [
        'Plastic Trays (Opening)',
        `${prevPlastic} trays`,
        'Plastic Received',
        `${plasticRecv} trays`,
        'Plastic Used / Dispatched',
        `${plasticUsed} trays (Stock: ${closingPlastic})`,
      ],
      [
        'Cardboard Trays (Opening)',
        `${prevCardboard} trays`,
        'Cardboard Received',
        `${cardboardRecv} trays`,
        'Cardboard Used & Waste',
        `Used: ${cardboardUsed}, Waste: ${cardboardWasted} (Stock: ${closingCardboard})`,
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // SECTION 5: Egg Production, Sales & Usage (if egg tracking enabled)
  if (flock.eggTrackingEnabled) {
    const usageDetails = (record.eggUsage || []).length > 0
      ? (record.eggUsage || []).map((u) => `${u.type.replace('-', ' ')}: ${u.peti}p ${u.trays}t`).join(' | ')
      : 'None recorded';

    autoTable(doc, {
      startY: currentY,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
      head: [[
        { content: '5. EGG PRODUCTION, DISPATCHES & USAGE AUDIT', colSpan: 6, styles: { fillColor: [225, 225, 225], fontStyle: 'bold' } }
      ]],
      body: [
        [
          'Carried Egg Stock',
          `${prevEggs.formatted} (${prevEggTotal.toLocaleString()} eggs)`,
          'Today\'s Production',
          `${prodPeti} Peti, ${prodTrays} Trays (${prodTotalEggs.toLocaleString()} eggs)`,
          'Total Produced Till Now',
          `${cumulativeEggFormatted} (${cumulativeEggEggs.toLocaleString()} eggs)`,
        ],
        [
          'Eggs Sold / Dispatched',
          `${soldPeti} Peti, ${soldTrays} Trays (${soldTotalEggs.toLocaleString()} eggs)`,
          'Production Laying %',
          `${eggProdPct}% (Internal Usage: ${usageEggsTotal.toLocaleString()} eggs)`,
          { content: 'Closing Egg Stock', styles: { fontStyle: 'bold' } },
          { content: `${closingEggBreakdown.formatted} (${closingEggTotal.toLocaleString()} eggs)`, styles: { fontStyle: 'bold' } },
        ],
      ],
    });

    currentY = (doc as any).lastAutoTable.finalY + 3;
  }

  // SECTION 6: Diesel Fuel Audit
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    head: [[
      { content: '6. DIESEL FUEL & GENERATOR CONSUMPTION AUDIT', colSpan: 6, styles: { fillColor: [225, 225, 225], fontStyle: 'bold' } }
    ]],
    body: [
      [
        'Carried Diesel (Prev Day)',
        `${prevDiesel} Liters`,
        'Arrival / Purchased Today',
        `${dieselArrival} Liters`,
        'Consumed Today',
        `${dieselUsed} Liters`,
      ],
      [
        { content: 'Closing Diesel Stock Balance', styles: { fontStyle: 'bold' } },
        { content: `${closingDiesel} Liters remaining in tank`, colSpan: 5, styles: { fontStyle: 'bold' } },
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // SECTION 7: Body Weight, Uniformity & Water / Medication Audit
  const meds = record.medicine?.medicines || [];
  const medDetails = meds.length > 0
    ? meds
        .map((m) => {
          const unit = m.dosageUnit || 'ml';
          const dosage = m.dosagePerLiter != null && m.dosagePerLiter > 0 ? `${m.dosagePerLiter} ${unit}` : '';
          const ratio = m.ratio ? `Ratio: ${m.ratio}` : '';
          const details = [dosage, ratio].filter(Boolean).join(', ');
          return `${m.name || 'Medicine'}${details ? ` (${details})` : ''}`;
        })
        .join(', ')
    : 'No medication administered';

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    head: [[
      { content: '7. BODY WEIGHT, UNIFORMITY & WATER / MEDICATION AUDIT', colSpan: 6, styles: { fillColor: [225, 225, 225], fontStyle: 'bold' } }
    ]],
    body: [
      [
        'Sample Average Weight',
        record.weight?.weight ? `${record.weight.weight} grams` : 'Not recorded today',
        'Flock Uniformity',
        record.weight?.uniformity ? `${record.weight.uniformity}%` : 'Not recorded today',
        'Water Intake',
        `${waterLiters} Liters (${waterPerBirdMl} ml/bird)`,
      ],
      [
        'Water Regimen Type',
        record.medicine?.type === 'medicine' ? 'Medicated Water Treatment' : 'Plain Fresh Water',
        'Medications Added',
        { content: medDetails, colSpan: 3 },
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  // SECTION 8: Vaccination & Clinical Events
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    head: [[
      { content: '8. VACCINATION & VETERINARY CLINICAL LOG', colSpan: 4, styles: { fillColor: [225, 225, 225], fontStyle: 'bold' } }
    ]],
    body: [
      [
        'Vaccine Administered',
        record.vaccination?.vaccineName || 'No vaccine administered on this date',
        'Administration / Clinical Notes',
        record.vaccination?.notes || 'Routine observation - flock healthy',
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // SECTION 9: Official Sign-off & Verification Block (Matching user's official sheet)
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    head: [[
      { content: 'OFFICIAL AUDIT VERIFICATION & OPERATIONAL SIGN-OFF', colSpan: 3, styles: { fillColor: [225, 225, 225], fontStyle: 'bold', halign: 'center' } }
    ]],
    body: [
      [
        'PREPARED BY (OPERATOR / ASST):\n\n___________________________________\nSignature / Date',
        'SHED SUPERVISOR:\n\n___________________________________\nSignature / Date',
        'FARM MANAGER:\n\n___________________________________\nSignature / Date',
      ],
    ],
  });

  // Footer note
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `System Generated Audit Sheet • Generated on ${new Date().toLocaleString()} • Farm Data Management System • ${companyName}`,
    105,
    pageHeight - 6,
    { align: 'center' }
  );

  return doc;
}

/**
 * Downloads the Daily Audit PDF directly with an official file name.
 */
export function downloadDailyAuditPdf(
  flock: Flock,
  record: UnifiedDailyRecord,
  options?: AuditPdfOptions
): void {
  const doc = createDailyAuditPdf(flock, record, options);
  const sanitizedFlockCode = flock.flockCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Daily_Audit_${sanitizedFlockCode}_${record.date}.pdf`;
  doc.save(filename);
}

/**
 * Opens the Daily Audit PDF in a clean print preview window for printing or saving.
 */
export function printDailyAuditPdf(
  flock: Flock,
  record: UnifiedDailyRecord,
  options?: AuditPdfOptions
): void {
  const doc = createDailyAuditPdf(flock, record, options);
  const blobUrl = doc.output('bloburl');
  const printWindow = window.open(blobUrl as unknown as string, '_blank');
  if (printWindow) {
    printWindow.focus();
  }
}
