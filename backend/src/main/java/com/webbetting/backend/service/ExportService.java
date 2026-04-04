package com.webbetting.backend.service;

import com.webbetting.backend.model.User;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ExportService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public void exportUsersToCsv(PrintWriter writer, List<User> users) {
        writer.println("ID,Username,Nickname,Role,Balance,Status,Ngay Tao");
        for (User user : users) {
            writer.println(String.join(",",
                    user.getId().toString(),
                    user.getUsername(),
                    user.getNickname(),
                    user.getRole(),
                    user.getBalance().toString(),
                    user.isActive() ? "Active" : "Locked",
                    user.getCreatedAt() != null ? user.getCreatedAt().format(FMT) : ""
            ));
        }
    }

    public void exportUsersToExcel(OutputStream outputStream, List<User> users) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            XSSFSheet sheet = workbook.createSheet("Users");

            // ── Header style ──
            XSSFCellStyle headerStyle = workbook.createCellStyle();
            XSSFFont headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 12);
            headerFont.setColor(IndexedColors.WHITE.getIndex());  // Chữ trắng
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 26, (byte) 26, (byte) 46}, null));
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBottomBorderColor(IndexedColors.GOLD.getIndex());

            // ── Row styles (thêm màu chữ trắng) ──
            XSSFCellStyle rowEven = workbook.createCellStyle();
            rowEven.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 20, (byte) 20, (byte) 35}, null));
            rowEven.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            // ✅ THÊM: màu chữ trắng cho row chẵn
            XSSFFont rowEvenFont = workbook.createFont();
            rowEvenFont.setColor(IndexedColors.WHITE.getIndex());
            rowEven.setFont(rowEvenFont);

            XSSFCellStyle rowOdd = workbook.createCellStyle();
            rowOdd.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 15, (byte) 15, (byte) 26}, null));
            rowOdd.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            // ✅ THÊM: màu chữ trắng cho row lẻ
            XSSFFont rowOddFont = workbook.createFont();
            rowOddFont.setColor(IndexedColors.WHITE.getIndex());
            rowOdd.setFont(rowOddFont);

            // ✅ Style cho cột Balance (chữ vàng)
            XSSFCellStyle goldStyle = workbook.createCellStyle();
            XSSFFont goldFont = workbook.createFont();
            goldFont.setColor(new XSSFColor(new byte[]{(byte) 255, (byte) 204, (byte) 0}, null)); // Vàng
            goldFont.setBold(true);
            goldStyle.setFont(goldFont);
            goldStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 15, (byte) 15, (byte) 26}, null));
            goldStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // ✅ Style cho trạng thái Active (chữ xanh)
            XSSFCellStyle activeStyle = workbook.createCellStyle();
            XSSFFont activeFont = workbook.createFont();
            activeFont.setColor(new XSSFColor(new byte[]{(byte) 0, (byte) 200, (byte) 100}, null)); // Xanh lá
            activeFont.setBold(true);
            activeStyle.setFont(activeFont);
            activeStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 15, (byte) 15, (byte) 26}, null));
            activeStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // ✅ Style cho trạng thái Locked (chữ đỏ)
            XSSFCellStyle lockedStyle = workbook.createCellStyle();
            XSSFFont lockedFont = workbook.createFont();
            lockedFont.setColor(new XSSFColor(new byte[]{(byte) 255, (byte) 80, (byte) 80}, null)); // Đỏ
            lockedFont.setBold(true);
            lockedStyle.setFont(lockedFont);
            lockedStyle.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 15, (byte) 15, (byte) 26}, null));
            lockedStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // ── Header row ──
            String[] headers = {"ID", "Username", "Nickname", "Role", "Balance (KGT)", "Trạng Thái", "Ngày Tạo"};
            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(22);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // ── Data rows ──
            int rowNum = 1;
            for (User user : users) {
                Row row = sheet.createRow(rowNum);
                row.setHeightInPoints(18);
                XSSFCellStyle base = (rowNum % 2 == 0) ? rowEven : rowOdd;

                createStyledCell(row, 0, user.getId().toString(), base);
                createStyledCell(row, 1, user.getUsername(), base);
                createStyledCell(row, 2, user.getNickname(), base);
                createStyledCell(row, 3, user.getRole(), base);
                createStyledCell(row, 4, user.getBalance().toString(), goldStyle);
                createStyledCell(row, 5, user.isActive() ? "✓ Active" : "✗ Locked",
                        user.isActive() ? activeStyle : lockedStyle);
                createStyledCell(row, 6,
                        user.getCreatedAt() != null ? user.getCreatedAt().format(FMT) : "", base);
                rowNum++;
            }

            // ── Column widths ──
            int[] widths = {8, 20, 20, 12, 18, 14, 20};
            for (int i = 0; i < widths.length; i++) {
                sheet.setColumnWidth(i, widths[i] * 256);
            }

            workbook.write(outputStream);
        }
    }

    private void createStyledCell(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }
}
