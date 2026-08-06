package com.example.bilingreader.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bilingreader.data.model.Book

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChapterSidebar(
    visible: Boolean,
    book: Book?,
    currentPairIndex: Int,
    columnsSwapped: Boolean,
    isDarkTheme: Boolean,
    fontSizeSp: Int,
    onPairSelected: (Int) -> Unit,
    onDismiss: () -> Unit
) {
    if (!visible || book == null) return

    val chapters = buildList {
        var acc = 0
        for (ch in book.chapters) {
            val title = if (columnsSwapped) {
                ch.titleTgt?.takeIf { it.isNotBlank() } ?: ch.titleSrc?.takeIf { it.isNotBlank() }
            } else {
                ch.titleSrc?.takeIf { it.isNotBlank() } ?: ch.titleTgt?.takeIf { it.isNotBlank() }
            }
            if (title != null) {
                add(ChapterEntry(title = title, startIdx = acc))
            }
            acc += ch.pairs.size
        }
    }

    val bgColor = if (isDarkTheme) Color(0xFF1A1E24) else Color(0xFFF4F6F8)
    val textColor = if (isDarkTheme) Color(0xFFD1D5DB) else Color(0xFF1F2937)
    val dividerColor = if (isDarkTheme) Color(0x14FFFFFF) else Color(0x14000000)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(),
        containerColor = bgColor,
        contentColor = textColor,
        scrimColor = Color.Black.copy(alpha = 0.4f)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(bottom = 32.dp)
        ) {
            chapters.forEachIndexed { ci, entry ->
                val nextStart = chapters.getOrNull(ci + 1)?.startIdx ?: Int.MAX_VALUE
                val isCurrent = currentPairIndex in entry.startIdx until nextStart
                
                Text(
                    text = entry.title,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onPairSelected(entry.startIdx); onDismiss() }
                        .padding(horizontal = 20.dp, vertical = 14.dp),
                    fontSize = if (isCurrent) fontSizeSp.sp else (fontSizeSp - 3).sp,
                    fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                    color = textColor
                )
                HorizontalDivider(color = dividerColor)
            }
        }
    }
}

private data class ChapterEntry(val title: String, val startIdx: Int)
