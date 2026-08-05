package com.example.bilingreader.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.bilingreader.data.model.Book

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChapterSidebar(
    visible: Boolean,
    book: Book?,
    currentPairIndex: Int,
    columnsSwapped: Boolean,
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

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState()
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
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    style = if (isCurrent) MaterialTheme.typography.titleSmall
                        else MaterialTheme.typography.bodyMedium,
                    color = if (isCurrent) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurface
                )
                HorizontalDivider()
            }
        }
    }
}

private data class ChapterEntry(val title: String, val startIdx: Int)
