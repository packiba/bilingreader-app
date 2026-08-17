package com.example.bilingreader.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInWindow
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalTextToolbar
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Popup
import com.example.bilingreader.ui.screen.ExpandMode
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

@Composable
fun PairRow(
    srcText: String,
    tgtText: String,
    isRead: Boolean,
    isZebra: Boolean,
    isDarkTheme: Boolean,
    fontSizeSp: Int,
    expandMode: ExpandMode = ExpandMode.NONE,
    isSpeaking: Boolean = false,
    onSpeakToggle: () -> Unit = {},
    isSrcBulgarian: Boolean = false,
    onTranslate: suspend (word: String, isBulgarian: Boolean) -> String = { _, _ -> "" },
    onSwipeLeft: () -> Unit,
    onSwipeRight: () -> Unit
) {
    val dimmedColor = if (isDarkTheme) Color(0xFF888888) else Color(0xFF999999)
    val activeColor = if (isDarkTheme) Color(0xFFD1D5DB) else Color(0xFF333333)
    val zebraBg = if (isDarkTheme)
        (if (isZebra) Color(0xFF21262D) else Color(0xFF1A1E24))
        else (if (isZebra) Color(0xFFFFFFFF) else Color(0xFFF4F6F8))
    val textColor by animateColorAsState(if (isRead) dimmedColor else activeColor, label = "textColor")
    val dividerColor = if (isDarkTheme) Color(0x33FFFFFF) else Color(0x33000000)
    val speakerColor = if (isSpeaking) Color(0xFF4C9AFF) else dimmedColor
    // Reserve room on the right so the speaker icon never sits on top of text.
    val textEndPadding = 34.dp

    val scope = rememberCoroutineScope()
    val clipboardManager = LocalClipboardManager.current
    val selectionPopupState = remember { mutableStateOf<TranslationPopupState?>(null) }
    var rowOffset by remember { mutableStateOf(IntOffset.Zero) }
    
    @Composable
    fun SelectionToolbarProvider(isBulgarian: Boolean, content: @Composable () -> Unit) {
        val toolbar = remember(clipboardManager, isBulgarian) {
            SelectionTranslateToolbar(clipboardManager) { text ->
                val anchor = IntOffset(100, 100) 
                selectionPopupState.value = TranslationPopupState(word = text, anchor = anchor)
                scope.launch {
                    val result = runCatching { onTranslate(text, isBulgarian) }
                    selectionPopupState.value = result.fold(
                        onSuccess = { translation -> selectionPopupState.value?.copy(translation = translation) },
                        onFailure = { selectionPopupState.value?.copy(failed = true) }
                    )
                }
            }
        }
        CompositionLocalProvider(LocalTextToolbar provides toolbar) {
            // Using a Box here to ensure the toolbar content is correctly layered
            Box {
                content()
                toolbar.Content(isDarkTheme = isDarkTheme, parentGlobalOffset = rowOffset)
            }
        }
    }

    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = {
            when (it) {
                SwipeToDismissBoxValue.EndToStart -> { onSwipeLeft(); false }
                SwipeToDismissBoxValue.StartToEnd -> { onSwipeRight(); false }
                SwipeToDismissBoxValue.Settled -> false
            }
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        modifier = Modifier
            .fillMaxWidth()
            .onGloballyPositioned { coordinates ->
                val pos = coordinates.positionInWindow()
                rowOffset = IntOffset(pos.x.roundToInt(), pos.y.roundToInt())
            },
        backgroundContent = {},
        enableDismissFromStartToEnd = true,
        enableDismissFromEndToStart = true
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(zebraBg)
        ) {
            when (expandMode) {
                ExpandMode.SRC -> SelectionToolbarProvider(isBulgarian = isSrcBulgarian) {
                    SelectionContainer {
                        WordTapText(
                            text = srcText,
                            color = textColor,
                            fontSize = fontSizeSp.sp,
                            isBulgarian = isSrcBulgarian,
                            isDarkTheme = isDarkTheme,
                            onTranslate = onTranslate,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(start = 14.dp, end = textEndPadding, top = 4.dp, bottom = 4.dp)
                        )
                    }
                }
                ExpandMode.TGT -> SelectionToolbarProvider(isBulgarian = !isSrcBulgarian) {
                    SelectionContainer {
                        WordTapText(
                            text = tgtText,
                            color = textColor,
                            fontSize = fontSizeSp.sp,
                            isBulgarian = !isSrcBulgarian,
                            isDarkTheme = isDarkTheme,
                            onTranslate = onTranslate,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(start = 14.dp, end = textEndPadding, top = 4.dp, bottom = 4.dp)
                        )
                    }
                }
                else -> TwoColumnTextRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 14.dp, end = textEndPadding, top = 4.dp, bottom = 4.dp),
                    dividerColor = dividerColor,
                    left = {
                        SelectionToolbarProvider(isBulgarian = isSrcBulgarian) {
                            SelectionContainer {
                                WordTapText(
                                    text = srcText,
                                    color = textColor,
                                    fontSize = fontSizeSp.sp,
                                    isBulgarian = isSrcBulgarian,
                                    isDarkTheme = isDarkTheme,
                                    onTranslate = onTranslate,
                                    modifier = Modifier.padding(end = 6.dp)
                                )
                            }
                        }
                    },
                    right = {
                        SelectionToolbarProvider(isBulgarian = !isSrcBulgarian) {
                            SelectionContainer {
                                WordTapText(
                                    text = tgtText,
                                    color = textColor,
                                    fontSize = fontSizeSp.sp,
                                    isBulgarian = !isSrcBulgarian,
                                    isDarkTheme = isDarkTheme,
                                    onTranslate = onTranslate,
                                    modifier = Modifier.padding(start = 6.dp)
                                )
                            }
                        }
                    }
                )
            }

            // Always reads the Bulgarian half of this pair aloud, regardless of which side it's
            // displayed on (or whether that column is currently the only one shown).
            IconButton(
                onClick = onSpeakToggle,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .size(28.dp)
                    .padding(top = 2.dp, end = 2.dp)
            ) {
                Icon(
                    if (isSpeaking) Icons.Default.Stop else Icons.AutoMirrored.Filled.VolumeUp,
                    if (isSpeaking) "Остановить чтение" else "Прочитать вслух по-болгарски",
                    tint = speakerColor,
                    modifier = Modifier.size(16.dp)
                )
            }
        }

        selectionPopupState.value?.let { state ->
            TranslationPopup(state = state, isDarkTheme = isDarkTheme, onDismiss = { selectionPopupState.value = null })
        }
    }
}

/**
 * A short hold is required before translation appears.
 * A longer hold remains available for normal text selection.
 */
private const val WORD_SELECTION_HANDOFF_MILLIS = 450L

/** Local state for the translation popup — null means no popup is showing. */
private data class TranslationPopupState(
    val word: String,
    val anchor: IntOffset,
    val translation: String? = null,
    val failed: Boolean = false
)

/**
 * A [Text] that translates a word in a small popup.
 * [SelectionContainer] still handles longer presses and drag selection.
 * Direction follows [isBulgarian]: Bulgarian words use bg→ru; other words use ru→bg.
 */
@Composable
private fun WordTapText(
    text: String,
    color: Color,
    fontSize: TextUnit,
    isBulgarian: Boolean,
    isDarkTheme: Boolean,
    onTranslate: suspend (word: String, isBulgarian: Boolean) -> String,
    modifier: Modifier = Modifier
) {
    var layoutResult by remember(text) { mutableStateOf<TextLayoutResult?>(null) }
    var popup by remember { mutableStateOf<TranslationPopupState?>(null) }
    val scope = rememberCoroutineScope()

    Text(
        text = text,
        color = color,
        fontSize = fontSize,
        modifier = modifier.pointerInput(text, isBulgarian) {
            awaitEachGesture {
                // Never consume the pointer events here. SelectionContainer must see the same
                // gesture and keep ownership when the user holds long enough to select text.
                val down = awaitFirstDown(requireUnconsumed = false)
                val startedAt = android.os.SystemClock.uptimeMillis()
                var translate = false

                withTimeoutOrNull(WORD_SELECTION_HANDOFF_MILLIS) {
                    while (true) {
                        val event = awaitPointerEvent(PointerEventPass.Main)
                        
                        // If anyone else (like selection handles) consumed the event, we stop.
                        if (event.changes.any { it.isConsumed }) {
                            return@withTimeoutOrNull
                        }

                        // A slightly higher slop to prevent accidental translation while starting a drag.
                        if (event.changes.any { it.positionChange().getDistanceSquared() > 40f }) {
                            return@withTimeoutOrNull
                        }
                        
                        val released = event.changes.any { !it.pressed }
                        if (released) {
                            translate = true
                            return@withTimeoutOrNull
                        }

                        val elapsed = android.os.SystemClock.uptimeMillis() - startedAt
                        if (elapsed >= WORD_SELECTION_HANDOFF_MILLIS) {
                            return@withTimeoutOrNull
                        }
                    }
                }

                if (translate) {
                    val layout = layoutResult
                    if (layout != null) {
                        val charOffset = layout.getOffsetForPosition(down.position)
                        if (charOffset in text.indices) {
                            val boundary = layout.getWordBoundary(charOffset)
                            val rawWord = text.substring(boundary.start, boundary.end)
                            val word = rawWord.trim { ch -> !ch.isLetter() }
                            if (word.isNotBlank()) {
                                val anchor = IntOffset(
                                    down.position.x.roundToInt(),
                                    down.position.y.roundToInt()
                                )
                                popup = TranslationPopupState(word = word, anchor = anchor)
                                scope.launch {
                                    val result = runCatching { onTranslate(word, isBulgarian) }
                                    popup = result.fold(
                                        onSuccess = { translation -> popup?.copy(translation = translation) },
                                        onFailure = { popup?.copy(failed = true) }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        onTextLayout = { layoutResult = it }
    )

    popup?.let { state ->
        TranslationPopup(state = state, isDarkTheme = isDarkTheme, onDismiss = { popup = null })
    }
}

@Composable
private fun TranslationPopup(
    state: TranslationPopupState,
    isDarkTheme: Boolean,
    onDismiss: () -> Unit
) {
    val bg = if (isDarkTheme) Color(0xFF2D333B) else Color(0xFFFFFFFF)
    val titleColor = if (isDarkTheme) Color(0xFFADBAC7) else Color(0xFF24292F)
    val bodyColor = if (isDarkTheme) Color(0xFFE6EDF3) else Color(0xFF1A1E24)
    val errorColor = Color(0xFFE06C75)

    Popup(alignment = Alignment.TopStart, offset = state.anchor, onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(10.dp),
            color = bg,
            shadowElevation = 6.dp,
            modifier = Modifier.widthIn(max = 240.dp)
        ) {
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                Text(
                    text = state.word,
                    color = titleColor,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
                when {
                    state.failed -> Text(
                        text = "Не удалось перевести",
                        color = errorColor,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                    state.translation == null -> CircularProgressIndicator(
                        modifier = Modifier
                            .padding(top = 6.dp, bottom = 2.dp)
                            .size(14.dp),
                        strokeWidth = 2.dp,
                        color = titleColor
                    )
                    else -> Text(
                        text = state.translation,
                        color = bodyColor,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }
        }
    }
}

/**
 * Two equal-width text columns with a hairline divider stretched to match whichever column is
 * taller — visually identical to `Row(Modifier.height(IntrinsicSize.Min))` with a weighted
 * divider, but each Text is measured exactly once instead of twice.
 *
 * `IntrinsicSize.Min` needs the min intrinsic height of both children *before* it can give the
 * Row a final height, which means Compose measures each Text a first time just to ask "how tall
 * would you be", then measures both again with that height locked in — a full extra text-layout
 * pass per row. On a list with thousands of rows of very different paragraph lengths, that
 * second pass was real, avoidable work happening on every row that scrolls into view.
 *
 * Here we measure the two texts once (their height is exactly what we need — no second guess
 * required), take the taller of the two, and only give the divider a height, since it's the one
 * element whose size genuinely depends on the others.
 */
@Composable
private fun TwoColumnTextRow(
    modifier: Modifier = Modifier,
    dividerColor: Color,
    left: @Composable () -> Unit,
    right: @Composable () -> Unit
) {
    val dividerWidthPx = with(LocalDensity.current) { 0.5.dp.roundToPx() }.coerceAtLeast(1)
    Layout(
        contents = listOf(
            left,
            { Box(Modifier.background(dividerColor)) },
            right
        ),
        modifier = modifier
    ) { (leftMeasurables, dividerMeasurables, rightMeasurables), constraints ->
        val leftMeasurable = leftMeasurables.first()
        val rightMeasurable = rightMeasurables.first()
        val dividerMeasurable = dividerMeasurables.first()

        val columnWidth = ((constraints.maxWidth - dividerWidthPx) / 2).coerceAtLeast(0)
        val columnConstraints = Constraints(
            minWidth = columnWidth,
            maxWidth = columnWidth,
            minHeight = 0,
            maxHeight = Constraints.Infinity
        )

        val leftPlaceable = leftMeasurable.measure(columnConstraints)
        val rightPlaceable = rightMeasurable.measure(columnConstraints)
        val rowHeight = maxOf(leftPlaceable.height, rightPlaceable.height)

        val dividerPlaceable = dividerMeasurable.measure(
            Constraints(
                minWidth = dividerWidthPx,
                maxWidth = dividerWidthPx,
                minHeight = rowHeight,
                maxHeight = rowHeight
            )
        )

        layout(constraints.maxWidth, rowHeight) {
            leftPlaceable.placeRelative(0, 0)
            dividerPlaceable.placeRelative(leftPlaceable.width, 0)
            rightPlaceable.placeRelative(leftPlaceable.width + dividerPlaceable.width, 0)
        }
    }
}
