package com.example.bilingreader.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PairRow(
    srcText: String,
    tgtText: String,
    isRead: Boolean,
    isZebra: Boolean,
    isDarkTheme: Boolean,
    fontSizeSp: Int,
    onSwipeLeft: () -> Unit,
    onSwipeRight: () -> Unit
) {
    val dimmedColor = if (isDarkTheme) Color(0xFF888888) else Color(0xFF999999)
    val activeColor = if (isDarkTheme) Color(0xFFD1D5DB) else Color(0xFF333333)
    val zebraBg = if (isDarkTheme)
        (if (isZebra) Color(0xFF21262D) else Color(0xFF1A1E24))
        else (if (isZebra) Color(0xFFFFFFFF) else Color(0xFFF4F6F8))
    val textColor by animateColorAsState(if (isRead) dimmedColor else activeColor, label = "textColor")

    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = {
            if (it == SwipeToDismissBoxValue.EndToStart) { onSwipeLeft(); false }
            else if (it == SwipeToDismissBoxValue.StartToEnd) { onSwipeRight(); false }
            else false
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        modifier = Modifier.fillMaxWidth(),
        backgroundContent = {},
        enableDismissFromStartToEnd = true,
        enableDismissFromEndToStart = true
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(zebraBg)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(IntrinsicSize.Min)
                    .padding(start = 14.dp, end = 4.dp, top = 4.dp, bottom = 4.dp)
            ) {
                // Left column
                Text(
                    text = srcText,
                    color = textColor,
                    fontSize = fontSizeSp.sp,
                    modifier = Modifier
                        .weight(1f)
                        .padding(end = 6.dp)
                )

                // Divider
                Box(
                    modifier = Modifier
                        .width(0.5.dp)
                        .fillMaxHeight()
                        .background(if (isDarkTheme) Color(0x33FFFFFF) else Color(0x33000000))
                )

                // Right column
                Text(
                    text = tgtText,
                    color = textColor,
                    fontSize = fontSizeSp.sp,
                    modifier = Modifier
                        .weight(1f)
                        .padding(start = 6.dp)
                )
            }
        }
    }
}
