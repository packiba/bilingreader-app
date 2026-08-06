package com.example.bilingreader.ui.pager

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.gestures.animateScrollBy
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.HorizontalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.bilingreader.ui.components.ChapterHeader
import com.example.bilingreader.ui.components.PairRow
import com.example.bilingreader.ui.screen.ReaderViewModel
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged

private const val SCROLL_ANIM_MILLIS = 320

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
    LaunchedEffect(listState) {
        snapshotFlow { state.scrollRequest }
            .distinctUntilChanged()
            .collect { request ->
                if (request == null) return@collect
                val target = request.index
                val visibleInfo = listState.layoutInfo.visibleItemsInfo.find { it.index == target }
                if (visibleInfo != null) {
                    // Item is already laid out: animate the exact remaining pixel distance
                    // with our own easing/duration, landing precisely at offset 0.
                    val duration = if (request.isSlow) SCROLL_ANIM_MILLIS * 2 else SCROLL_ANIM_MILLIS
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
    }

    val chapterHeaders = buildSet {
        var acc = 0
        var last: String? = null
        for (ch in book.chapters) {
            val title = if (state.columnsSwapped) ch.titleTgt else ch.titleSrc
            if (!title.isNullOrBlank() && title != last) {
                add(acc)
                last = title
            }
            acc += ch.pairs.size
        }
    }

    LazyColumn(
        state = listState,
        modifier = Modifier.fillMaxSize()
    ) {
        var globalIdx = 0

        for (chapter in book.chapters) {
            for (pair in chapter.pairs) {
                val idx = globalIdx
                val showHeader = idx in chapterHeaders

                item(key = idx) {
                    if (showHeader) {
                        ChapterHeader(
                            titleSrc = if (state.columnsSwapped) chapter.titleTgt ?: "" else chapter.titleSrc ?: "",
                            titleTgt = if (state.columnsSwapped) chapter.titleSrc ?: "" else chapter.titleTgt ?: "",
                            isDarkTheme = state.isDarkTheme,
                            fontSizeSp = state.fontSizeSp
                        )
                    }
                    PairRow(
                        srcText = if (state.columnsSwapped) pair.tgt else pair.src,
                        tgtText = if (state.columnsSwapped) pair.src else pair.tgt,
                        isRead = idx in state.readPairs,
                        isZebra = idx % 2 == 1,
                        isDarkTheme = state.isDarkTheme,
                        fontSizeSp = state.fontSizeSp,
                        onSwipeLeft = { viewModel.toggleReadAndNext(idx) },
                        onSwipeRight = { viewModel.markAsUnread(idx) }
                    )
                    HorizontalDivider(color = dividerColor)
                }
                globalIdx++
            }
        }
    }
}
