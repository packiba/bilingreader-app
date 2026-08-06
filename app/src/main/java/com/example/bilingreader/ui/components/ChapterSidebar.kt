package com.example.bilingreader.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bilingreader.data.model.Book
import kotlin.math.roundToInt

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
    val chapters = remember(book, columnsSwapped) {
        if (book == null) emptyList() else {
            buildList {
                var acc = 0
                for (ch in book.chapters) {
                    val title = if (columnsSwapped) ch.titleTgt else ch.titleSrc
                    if (!title.isNullOrBlank()) {
                        add(ChapterEntry(title = title, startIdx = acc))
                    }
                    acc += ch.pairs.size
                }
            }
        }
    }

    val bgColor = if (isDarkTheme) Color(0xFF1A1E24) else Color(0xFFF4F6F8)
    val textColor = if (isDarkTheme) Color(0xFFD1D5DB) else Color(0xFF1F2937)
    val dividerColor = if (isDarkTheme) Color(0x14FFFFFF) else Color(0x14000000)

    var offsetY by remember { mutableStateOf(0f) }
    val density = LocalContext.current.resources.displayMetrics.density
    
    // Reset offset when hidden
    LaunchedEffect(visible) {
        if (!visible) offsetY = 0f
    }

    if (visible || offsetY > 0f) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Scrim
            AnimatedVisibility(
                visible = visible,
                enter = fadeIn(),
                exit = fadeOut()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.4f))
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                            onClick = onDismiss
                        )
                )
            }

            // The Sheet
            AnimatedVisibility(
                visible = visible,
                enter = slideInVertically(initialOffsetY = { it }),
                exit = slideOutVertically(targetOffsetY = { it }),
                modifier = Modifier.align(Alignment.BottomCenter)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth(0.8f)
                        .fillMaxHeight(0.9f)
                        .offset { IntOffset(0, offsetY.roundToInt()) }
                        .draggable(
                            orientation = Orientation.Vertical,
                            state = rememberDraggableState { delta ->
                                offsetY = (offsetY + delta).coerceAtLeast(0f)
                            },
                            onDragStopped = { velocity ->
                                // dynamic threshold: dismiss only if dragged far down (>500dp) or swiped very fast
                                if (offsetY > 500 * density || velocity > 2000f) {
                                    onDismiss()
                                }
                                // Else: it just stays where it was dropped
                            }
                        )
                        .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
                        .background(bgColor)
                        .padding(bottom = 24.dp)
                ) {
                    // Handle bar at the top
                    Box(
                        modifier = Modifier
                            .padding(top = 10.dp, bottom = 10.dp)
                            .size(32.dp, 4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(textColor.copy(alpha = 0.2f))
                            .align(Alignment.CenterHorizontally)
                    )

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState())
                    ) {
                        chapters.forEachIndexed { ci, entry ->
                            val nextStart = chapters.getOrNull(ci + 1)?.startIdx ?: Int.MAX_VALUE
                            val isCurrent = currentPairIndex in entry.startIdx until nextStart

                            Text(
                                text = entry.title,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { 
                                        onPairSelected(entry.startIdx)
                                        onDismiss() 
                                    }
                                    .padding(horizontal = 20.dp, vertical = (fontSizeSp * 0.3).dp),
                                fontSize = if (isCurrent) fontSizeSp.sp else (fontSizeSp - 6).sp,
                                fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                                color = textColor
                            )
                            HorizontalDivider(color = dividerColor)
                        }
                    }
                }
            }
        }
    }
}

private data class ChapterEntry(val title: String, val startIdx: Int)
