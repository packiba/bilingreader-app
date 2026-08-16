package com.example.bilingreader.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PageSlider(
    currentPage: Int,
    totalPages: Int,
    enabled: Boolean = true,
    chapterStarts: List<Int> = emptyList(),
    onPageChange: (Int) -> Unit
) {
    // While the finger is down we track the drag position purely as local UI state and only
    // commit it (navigate + persist + animate scroll) once the drag ends. Committing on every
    // intermediate onValueChange tick was triggering a disk write and a fresh animated scroll
    // per pixel of drag, which is what made dragging the slider feel janky.
    var isDragging by remember { mutableStateOf(false) }
    var dragValue by remember { mutableFloatStateOf(currentPage.toFloat()) }
    val displayedPage = if (isDragging) dragValue.toInt() else currentPage

    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        if (enabled) {
            Text(text = "${displayedPage + 1} / $totalPages", fontSize = 11.sp)
        }
        Slider(
            value = if (isDragging) dragValue else currentPage.toFloat(),
            onValueChange = {
                if (enabled) {
                    isDragging = true
                    dragValue = it
                }
            },
            onValueChangeFinished = {
                isDragging = false
                if (enabled) onPageChange(dragValue.toInt())
            },
            valueRange = 0f..(totalPages - 1).coerceAtLeast(0).toFloat(),
            modifier = Modifier.weight(1f),
            enabled = enabled,
            thumb = {
                if (enabled) {
                    Box(
                        modifier = Modifier
                            .size(20.dp), // Increase touch target size
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary)
                        )
                    }
                }
            },
            track = { sliderState ->
                Box(modifier = Modifier.fillMaxWidth()) {
                    SliderDefaults.Track(
                        sliderState = sliderState,
                        modifier = Modifier.fillMaxWidth().height(2.dp),
                        thumbTrackGapSize = 0.dp,
                        trackInsideCornerSize = 1.dp,
                        drawStopIndicator = null
                    )
                    // Chapter-start tick marks, drawn over the track at the fractional position
                    // each chapter's first pair sits at within the full page range.
                    if (chapterStarts.isNotEmpty() && totalPages > 1) {
                        val tickColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.45f)
                        val range = (totalPages - 1).toFloat()
                        Canvas(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .align(Alignment.Center)
                        ) {
                            for (start in chapterStarts) {
                                if (start <= 0) continue // book start already marked by the track's own edge
                                val x = (start / range) * size.width
                                drawLine(
                                    color = tickColor,
                                    start = Offset(x, 0f),
                                    end = Offset(x, size.height),
                                    strokeWidth = 1.5.dp.toPx()
                                )
                            }
                        }
                    }
                }
            }
        )
    }
}
