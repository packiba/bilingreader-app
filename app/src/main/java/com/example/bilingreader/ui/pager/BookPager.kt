package com.example.bilingreader.ui.pager

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.gestures.animateScrollBy
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.HorizontalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.bilingreader.data.model.Book
import com.example.bilingreader.ui.components.ChapterHeader
import com.example.bilingreader.ui.components.PairRow
import com.example.bilingreader.ui.screen.ReaderViewModel
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged

private const val SCROLL_ANIM_MILLIS = 320

/**
 * One flattened, pre-resolved row of the book, built once per (book, columnsSwapped) pair
 * instead of being recomputed on every recomposition of [BookPager].
 */
private data class RenderRow(
    val idx: Int,
    val showHeader: Boolean,
    val headerTitleSrc: String,
    val headerTitleTgt: String,
    val srcText: String,
    val tgtText: String
)

private fun buildRenderRows(book: Book, columnsSwapped: Boolean): List<RenderRow> = buildList {
    var globalIdx = 0
    var lastHeaderTitle: String? = null
    for (chapter in book.chapters) {
        val title = if (columnsSwapped) chapter.titleTgt else chapter.titleSrc
        val showHeaderOnFirstPair = !title.isNullOrBlank() && title != lastHeaderTitle
        if (showHeaderOnFirstPair) lastHeaderTitle = title
        val headerTitleSrc = (if (columnsSwapped) chapter.titleTgt else chapter.titleSrc) ?: ""
        val headerTitleTgt = (if (columnsSwapped) chapter.titleSrc else chapter.titleTgt) ?: ""
        for ((i, pair) in chapter.pairs.withIndex()) {
            add(
                RenderRow(
                    idx = globalIdx,
                    showHeader = showHeaderOnFirstPair && i == 0,
                    headerTitleSrc = headerTitleSrc,
                    headerTitleTgt = headerTitleTgt,
                    srcText = if (columnsSwapped) pair.tgt else pair.src,
                    tgtText = if (columnsSwapped) pair.src else pair.tgt
                )
            )
            globalIdx++
        }
    }
}

@Composable
fun BookPager(viewModel: ReaderViewModel) {
    val state by viewModel.state.collectAsState()
    val book = state.book ?: return
    val listState = rememberLazyListState(
        initialFirstVisibleItemIndex = state.currentPairIndex
    )
    val dividerColor = if (state.isDarkTheme) Color(0x14FFFFFF) else Color(0x14000000)

    // Track the user's own manual scrolling — bookkeeping only, never re-triggers a scroll.
    LaunchedEffect(listState) {
        snapshotFlow { listState.firstVisibleItemIndex }
            .debounce(200)
            .collect { index -> viewModel.onUserScrolled(index) }
    }

    // Explicit navigation requests (mark-as-read, chapter jump, sidebar, slider) — always
    // smoothly animate and land the target row exactly at the top of the screen.
    val scrollRequest = state.scrollRequest
    LaunchedEffect(scrollRequest) {
        if (scrollRequest == null) return@LaunchedEffect
        val target = scrollRequest.index
        val visibleInfo = listState.layoutInfo.visibleItemsInfo.find { it.index == target }
        if (visibleInfo != null) {
            // Item is already laid out: animate the exact remaining pixel distance
            // with our own easing/duration, landing precisely at offset 0.
            val duration = if (scrollRequest.isSlow) SCROLL_ANIM_MILLIS * 2 else SCROLL_ANIM_MILLIS
            listState.animateScrollBy(
                value = visibleInfo.offset.toFloat(),
                animationSpec = tween(duration, easing = FastOutSlowInEasing)
            )
        } else {
            // Target far outside the current viewport (e.g. jumping chapters):
            // no pixel distance to measure yet, fall back to the built-in scroll.
            listState.animateScrollToItem(target)
        }
    }

    // Built once per (book, columnsSwapped) instead of being rebuilt on every recomposition —
    // previously this walked the entire book (thousands of pairs) on every state change, even
    // ones unrelated to the list content (font size, theme, scroll bookkeeping).
    val rows = remember(book, state.columnsSwapped) { buildRenderRows(book, state.columnsSwapped) }

    LazyColumn(
        state = listState,
        modifier = Modifier.fillMaxSize()
    ) {
        items(items = rows, key = { it.idx }) { row ->
            if (row.showHeader) {
                ChapterHeader(
                    titleSrc = row.headerTitleSrc,
                    titleTgt = row.headerTitleTgt,
                    isDarkTheme = state.isDarkTheme,
                    fontSizeSp = state.fontSizeSp
                )
            }
            PairRow(
                srcText = row.srcText,
                tgtText = row.tgtText,
                isRead = row.idx in state.readPairs,
                isZebra = row.idx % 2 == 1,
                isDarkTheme = state.isDarkTheme,
                fontSizeSp = state.fontSizeSp,
                onSwipeLeft = { viewModel.markAsReadAndNext(row.idx) },
                onSwipeRight = { viewModel.markAsUnread(row.idx) }
            )
            HorizontalDivider(color = dividerColor)
        }
    }
}
