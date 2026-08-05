package com.example.bilingreader.ui.screen

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.FileOpen
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.bilingreader.ui.components.ChapterSidebar
import com.example.bilingreader.ui.components.PageSlider
import com.example.bilingreader.ui.pager.BookPager
import kotlinx.coroutines.launch

@Composable
fun ReaderScreen(
    viewModel: ReaderViewModel,
    onFilePick: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    var showSidebar by remember { mutableStateOf(false) }
    var showToolbar by remember { mutableStateOf(true) }
    val totalPairs = state.book?.totalPairs ?: 0
    val bgColor = if (state.isDarkTheme) Color(0xFF1A1E24) else Color(0xFFF4F6F8)
    val contentColor = if (state.isDarkTheme) Color(0xFFCCCCCC) else Color(0xFF222222)

    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(state.error) {
        val message = state.error
        if (message != null) {
            scope.launch { snackbarHostState.showSnackbar(message) }
            viewModel.dismissError()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = bgColor
    ) { innerPadding ->
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(innerPadding)
            .background(bgColor)
            .windowInsetsPadding(WindowInsets.displayCutout)
    ) {
        // Thin top toolbar
        AnimatedVisibility(visible = showToolbar) {
            Column {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(36.dp)
                        .background(bgColor)
                        .padding(horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onFilePick, modifier = Modifier.height(32.dp)) {
                        Icon(
                            Icons.Default.FileOpen,
                            "Open file",
                            modifier = Modifier.height(18.dp),
                            tint = contentColor
                        )
                    }
                    if (state.fileName.isNotEmpty()) {
                        Text(
                            text = state.fileName,
                            maxLines = 1,
                            modifier = Modifier.weight(1f).padding(horizontal = 4.dp),
                            fontSize = 12.sp,
                            color = contentColor
                        )
                    } else {
                        Box(modifier = Modifier.weight(1f))
                    }
                    IconButton(onClick = { viewModel.toggleTheme() }, modifier = Modifier.height(32.dp)) {
                        Icon(
                            if (state.isDarkTheme) Icons.Default.DarkMode else Icons.Default.LightMode,
                            "Toggle theme",
                            modifier = Modifier.height(18.dp),
                            tint = contentColor
                        )
                    }
                    IconButton(onClick = { viewModel.toggleColumns() }, modifier = Modifier.height(32.dp)) {
                        Icon(
                            Icons.Default.SwapHoriz,
                            "Swap columns",
                            modifier = Modifier.height(18.dp),
                            tint = contentColor
                        )
                    }
                    IconButton(onClick = { viewModel.setFontSize(state.fontSizeSp - 1) }, modifier = Modifier.height(32.dp)) {
                        Icon(
                            Icons.Default.Remove,
                            "Decrease font",
                            modifier = Modifier.height(18.dp),
                            tint = contentColor
                        )
                    }
                    IconButton(onClick = { viewModel.setFontSize(state.fontSizeSp + 1) }, modifier = Modifier.height(32.dp)) {
                        Icon(
                            Icons.Default.Add,
                            "Increase font",
                            modifier = Modifier.height(18.dp),
                            tint = contentColor
                        )
                    }
                    IconButton(onClick = { showToolbar = false }, modifier = Modifier.height(32.dp)) {
                        Icon(
                            Icons.Default.KeyboardArrowUp,
                            "Hide toolbar",
                            modifier = Modifier.height(18.dp),
                            tint = contentColor
                        )
                    }
                }
                HorizontalDivider(thickness = 0.5.dp)
            }
        }

        // Content area
        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            if (state.isLoading) {
                Text("Loading...", modifier = Modifier.padding(16.dp))
            } else if (state.book != null) {
                BookPager(viewModel = viewModel)
            } else {
                Text("Open a JSON file to start reading", modifier = Modifier.padding(32.dp))
            }
        }

        // Bottom bar
        if (state.book != null && totalPairs > 0) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(40.dp)
                    .background(bgColor),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = { showToolbar = !showToolbar },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        if (showToolbar) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                        if (showToolbar) "Hide toolbar" else "Show toolbar",
                        modifier = Modifier.size(20.dp),
                        tint = contentColor
                    )
                }
                IconButton(
                    onClick = { viewModel.goToPrevChapter() },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        Icons.Default.SkipPrevious,
                        "Previous chapter",
                        modifier = Modifier.size(20.dp),
                        tint = contentColor
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    PageSlider(
                        currentPage = state.currentPairIndex,
                        totalPages = totalPairs,
                        onPageChange = { viewModel.setCurrentPairIndex(it) }
                    )
                }
                IconButton(
                    onClick = { viewModel.goToNextChapter() },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        Icons.Default.SkipNext,
                        "Next chapter",
                        modifier = Modifier.size(20.dp),
                        tint = contentColor
                    )
                }
                IconButton(
                    onClick = { showSidebar = true },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        Icons.Default.Menu,
                        "Chapters",
                        modifier = Modifier.size(20.dp),
                        tint = contentColor
                    )
                }
            }
        }
    }

    // Chapter sidebar (overlay)
    ChapterSidebar(
        visible = showSidebar,
        book = state.book,
        currentPairIndex = state.currentPairIndex,
        columnsSwapped = state.columnsSwapped,
        onPairSelected = { viewModel.setCurrentPairIndex(it) },
        onDismiss = { showSidebar = false }
    )
    }
}
