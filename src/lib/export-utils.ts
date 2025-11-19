'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EnrichedDataItem, EnrichedActivityLog, User } from './types';

export type ExportFormat = 'csv' | 'pdf';

interface ExportData {
  exportedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  assets: Array<{
    id: string;
    title: string;
    type: string;
    file_url?: string | null;
    link_url?: string | null;
    text_content?: string | null;
    created_at: string;
    updated_at: string;
  }>;
  activityLogs: Array<{
    id: string;
    action: string;
    item_title: string | null;
    timestamp: string;
  }>;
}

/**
 * Export data as CSV
 */
export function exportToCSV(data: ExportData): void {
  const csvRows: string[] = [];

  // Add header
  csvRows.push('Vaultspace Data Export');
  csvRows.push(`Exported At: ${new Date(data.exportedAt).toLocaleString()}`);
  csvRows.push(`User: ${data.user.name} (${data.user.email})`);
  csvRows.push('');

  // Assets section
  csvRows.push('ASSETS');
  csvRows.push('ID,Title,Type,File URL,Link URL,Text Content,Created At,Updated At');
  data.assets.forEach((asset) => {
    const row = [
      asset.id,
      `"${asset.title.replace(/"/g, '""')}"`, // Escape quotes in CSV
      asset.type,
      asset.file_url || '',
      asset.link_url || '',
      asset.text_content ? `"${asset.text_content.replace(/"/g, '""')}"` : '',
      asset.created_at,
      asset.updated_at,
    ];
    csvRows.push(row.join(','));
  });
  csvRows.push('');

  // Activity Logs section
  csvRows.push('ACTIVITY LOGS');
  csvRows.push('ID,Action,Item Title,Timestamp');
  data.activityLogs.forEach((log) => {
    const row = [
      log.id,
      log.action,
      log.item_title ? `"${log.item_title.replace(/"/g, '""')}"` : '',
      log.timestamp,
    ];
    csvRows.push(row.join(','));
  });

  // Create blob and download
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vaultspace-export-${data.user.id}-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data as PDF
 */
export function exportToPDF(data: ExportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  doc.setFontSize(18);
  doc.text('Vaultspace Data Export', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(10);
  doc.text(`Exported At: ${new Date(data.exportedAt).toLocaleString()}`, 14, yPosition);
  yPosition += 6;
  doc.text(`User: ${data.user.name} (${data.user.email})`, 14, yPosition);
  yPosition += 6;
  doc.text(`Role: ${data.user.role}`, 14, yPosition);
  yPosition += 10;

  // Assets table
  doc.setFontSize(14);
  doc.text('Assets', 14, yPosition);
  yPosition += 8;

  const assetsData = data.assets.map((asset) => [
    asset.title.substring(0, 30) + (asset.title.length > 30 ? '...' : ''),
    asset.type,
    asset.created_at ? new Date(asset.created_at).toLocaleDateString() : '',
    asset.updated_at ? new Date(asset.updated_at).toLocaleDateString() : '',
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Title', 'Type', 'Created', 'Updated']],
    body: assetsData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 139, 202] },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      yPosition = data.cursor.y + 10;
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Check if we need a new page
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = 20;
  }

  // Activity Logs table
  doc.setFontSize(14);
  doc.text('Activity Logs', 14, yPosition);
  yPosition += 8;

  const logsData = data.activityLogs.map((log) => [
    log.action,
    log.item_title ? (log.item_title.substring(0, 30) + (log.item_title.length > 30 ? '...' : '')) : 'N/A',
    log.timestamp ? new Date(log.timestamp).toLocaleString() : '',
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Action', 'Item Title', 'Timestamp']],
    body: logsData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 139, 202] },
    margin: { left: 14, right: 14 },
  });

  // Save PDF
  doc.save(`vaultspace-export-${data.user.id}-${Date.now()}.pdf`);
}

/**
 * Prepare export data from assets and activity logs
 */
export function prepareExportData(
  assets: EnrichedDataItem[],
  activityLogs: EnrichedActivityLog[],
  currentUser: User
): ExportData {
  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
    },
    assets: assets.map((asset) => ({
      id: asset.id,
      title: asset.title,
      type: asset.type,
      file_url: asset.file_url,
      link_url: asset.link_url,
      text_content: asset.text_content,
      created_at: asset.created_at,
      updated_at: asset.updated_at,
    })),
    activityLogs: activityLogs.map((log) => ({
      id: log.id,
      action: log.action,
      item_title: log.item_title,
      timestamp: log.timestamp,
    })),
  };
}

