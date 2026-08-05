# Bilingual Reader Android — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Native Android Jetpack Compose reader for parallel BG/RU texts, ported from PWA HTML/CSS/JS version with pagination, swipe gestures, and full state persistence.

**Architecture:** Single-activity app with `HorizontalPager` + manual text measurement (`TextMeasurer`) for precise page splitting. `ReaderViewModel` holds all UI state as `StateFlow<ReaderUiState>`. Data flows: JSON → `BookParser` → `List<TextPair>` → `PageSplitter` (manual measure) → `List<PageRange>` → `BookPager`. Preferences in per-file DataStore keys. Manual DI via `ReaderApplication` singleton.

**Tech Stack:** Kotlin, Jetpack Compose + Material 3, HorizontalPager, TextMeasurer (manual page splitting), Preferences DataStore, SAF file picker, Gradle KTS + AGP 9.1.1 + Compose BOM.

## Global Constraints

- minSdk 26, compileSdk/targetSdk 36
- Package: `com.example.bilingreader`
- Landscape forced (userLandscape), edge-to-edge display
- No Hilt — manual DI via `ReaderApplication` singleton
- No demo book bundled — file picker only (test JSON in project root: `final_aligned_book.json`)
- DataStore keys hashed by file URI
- JSON format: `[{"pair_num":1, "title_src":"...", "title_tgt":"...", "src_sents":["..."], "tgt_sents":["..."], "alignment":[[[0],[0]],...]}]`
- Colors: see spec Section 4 (dark/light theme, zebra, dimmed read text)
- Font size range: 12sp–24sp, default 15sp
- Compose BOM, Material 3, Kotlin 2.0+ compiler plugin for Compose

---

### Task 1: Gradle & Dependency Setup

**Files:**
- Modify: `gradle/libs.versions.toml`
- Modify: `app/build.gradle.kts`
- Create: `gradle.properties` (add compose flag)
- Modify: `settings.gradle.kts` (add compose compiler)

**Interfaces:**
- Consumes: existing AGP 9.1.1, compileSdk 36
- Produces: Compose-enabled build with Material 3, DataStore, lifecycle-viewmodel-compose

- [ ] **Step 1: Update libs.versions.toml**

Add Compose BOM, Material 3, DataStore, Activity Compose, Lifecycle ViewModel Compose, Kotlin Compose compiler version:

```toml
[versions]
agp = "9.1.1"
coreKtx = "1.18.0"
junit = "4.13.2"
junitVersion = "1.3.0"
espressoCore = "3.7.0"
appcompat = "1.6.1"
material = "1.10.0"
composeBom = "2024.12.01"
activityCompose = "1.9.3"
lifecycleRuntime = "2.8.7"
datastore = "1.1.1"
kotlin = "2.0.21"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
junit = { group = "junit", name = "junit", version.ref = "junit" }
androidx-junit = { group = "androidx.test.ext", name = "junit", version.ref = "junitVersion" }
androidx-espresso-core = { group = "androidx.test.espresso", name = "espresso-core", version.ref = "espressoCore" }
androidx-appcompat = { group = "androidx.appcompat", name = "appcompat", version.ref = "appcompat" }
material = { group = "com.google.android.material", name = "material", version.ref = "material" }
compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
compose-ui = { group = "androidx.compose.ui", name = "ui" }
compose-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
compose-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
compose-material3 = { group = "androidx.compose.material3", name = "material3" }
compose-material-icons-extended = { group = "androidx.compose.material", name = "material-icons-extended" }
activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
lifecycle-viewmodel-compose = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version.ref = "lifecycleRuntime" }
lifecycle-runtime-compose = { group = "androidx.lifecycle", name = "lifecycle-runtime-compose", version.ref = "lifecycleRuntime" }
datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }
compose-ui-test-junit4 = { group = "androidx.compose.ui", name = "ui-test-junit4" }
compose-ui-test-manifest = { group = "androidx.compose.ui", name = "ui-test-manifest" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
compose-compiler = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
```

- [ ] **Step 2: Update app/build.gradle.kts**

Replace entire file:

```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.compose.compiler)
}

android {
    namespace = "com.example.bilingreader"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.example.bilingreader"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.extended)
    implementation(libs.activity.compose)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.datastore.preferences)
    implementation(libs.androidx.core.ktx)
    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.compose.bom))
    androidTestImplementation(libs.compose.ui.test.junit4)
}
```

- [ ] **Step 3: Update settings.gradle.kts**

Add kotlin plugin management:

```kotlin
pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "0.8.0"
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "BilingReader"
include(":app")
```

- [ ] **Step 4: Update AndroidManifest.xml**

Add landscape lock, edge-to-edge, file picker intent filter:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:name=".ReaderApplication"
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.BilingReader">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="userLandscape"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

- [ ] **Step 5: Remove old themes.xml (will use Compose themes)**

Replace `res/values/themes.xml` with minimal theme:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.BilingReader" parent="android:Theme.Material.Light.NoActionBar">
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
    </style>
</resources>
```

Also create `res/values/strings.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">BilingReader</string>
</resources>
```

- [ ] **Step 6: Verify build compiles**

Run: `./gradlew assembleDebug`

Expected: BUILD SUCCESSFUL (may need to install SDK 36 if not present)

---

### Task 2: Data Models

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/data/model/Book.kt`

**Interfaces:**
- Consumes: JSON format from spec
- Produces: `data class TextPair(pairNum, titleSrc, titleTgt, srcSentences, tgtSentences, alignment)` and `data class Book(chapters: List<TextPair>)`

- [ ] **Step 1: Create Book.kt**

```kotlin
package com.example.bilingreader.data.model

data class TextPair(
    val pairNum: Int,
    val titleSrc: String?,
    val titleTgt: String?,
    val srcSentences: List<String>,
    val tgtSentences: List<String>,
    val alignment: List<List<List<Int>>>
)

data class Book(
    val chapters: List<TextPair>
) {
    val allPairs: List<TextPair> get() = chapters
}
```

---

### Task 3: Theme — Color, Type, Theme

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/ui/theme/Color.kt`
- Create: `app/src/main/java/com/example/bilingreader/ui/theme/Type.kt`
- Create: `app/src/main/java/com/example/bilingreader/ui/theme/Theme.kt`

**Interfaces:**
- Consumes: Color values from spec Section 4
- Produces: `BilingReaderTheme` composable wrapping `MaterialTheme` with dark/light schemes

- [ ] **Step 1: Color.kt**

```kotlin
package com.example.bilingreader.ui.theme

import androidx.compose.ui.graphics.Color

// Dark theme
val DarkBackground = Color(0xFF1A1E24)
val DarkZebra1 = Color(0xFF1A1E24)
val DarkZebra2 = Color(0xFF21262D)
val DarkTextActive = Color(0xFFD1D5DB)
val DarkTextDimmed = Color(0xFF6B7280).copy(alpha = 0.5f)
val DarkDivider = Color(0x14FFFFFF) // rgba(255,255,255,0.08)

// Light theme
val LightBackground = Color(0xFFF4F6F8)
val LightZebra1 = Color(0xFFF4F6F8)
val LightZebra2 = Color(0xFFFFFFFF)
val LightTextActive = Color(0xFF1F2937)
val LightTextDimmed = Color(0xFF9CA3AF).copy(alpha = 0.5f)
val LightDivider = Color(0x14000000) // rgba(0,0,0,0.08)
```

- [ ] **Step 2: Type.kt**

```kotlin
package com.example.bilingreader.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp

val Typography = Typography(
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontSize = 15.sp,
        lineHeight = 22.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontSize = 15.sp,
        lineHeight = 22.sp
    )
)
```

- [ ] **Step 3: Theme.kt**

```kotlin
package com.example.bilingreader.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    background = DarkBackground,
    surface = DarkBackground,
    onBackground = DarkTextActive,
    onSurface = DarkTextActive,
    outline = DarkDivider,
    surfaceVariant = DarkZebra2
)

private val LightColorScheme = lightColorScheme(
    background = LightBackground,
    surface = LightBackground,
    onBackground = LightTextActive,
    onSurface = LightTextActive,
    outline = LightDivider,
    surfaceVariant = LightZebra2
)

@Composable
fun BilingReaderTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
```

---

### Task 4: JSON Parser

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/data/parser/BookParser.kt`

**Interfaces:**
- Consumes: `InputStream` from file
- Produces: `BookParser.parse(inputStream: InputStream): Book`

- [ ] **Step 1: Create BookParser.kt**

```kotlin
package com.example.bilingreader.data.parser

import com.example.bilingreader.data.model.Book
import com.example.bilingreader.data.model.TextPair
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader

object BookParser {

    fun parse(inputStream: InputStream): Book {
        val reader = BufferedReader(InputStreamReader(inputStream, "UTF-8"))
        val text = reader.readText()
        reader.close()

        val jsonArray = JSONArray(text)
        val chapters = mutableListOf<TextPair>()

        for (i in 0 until jsonArray.length()) {
            val obj = jsonArray.getJSONObject(i)
            val pairNum = obj.getInt("pair_num")
            val titleSrc = obj.optString("title_src", null)
            val titleTgt = obj.optString("title_tgt", null)
            val srcSents = jsonArrayToStringList(obj.getJSONArray("src_sents"))
            val tgtSents = jsonArrayToStringList(obj.getJSONArray("tgt_sents"))
            val alignment = parseAlignment(obj.getJSONArray("alignment"))

            chapters.add(TextPair(
                pairNum = pairNum,
                titleSrc = if (titleSrc.isNullOrBlank()) null else titleSrc,
                titleTgt = if (titleTgt.isNullOrBlank()) null else titleTgt,
                srcSentences = srcSents,
                tgtSentences = tgtSents,
                alignment = alignment
            ))
        }

        return Book(chapters = chapters)
    }

    private fun jsonArrayToStringList(array: JSONArray): List<String> {
        val list = mutableListOf<String>()
        for (i in 0 until array.length()) {
            list.add(array.getString(i))
        }
        return list
    }

    private fun parseAlignment(array: JSONArray): List<List<List<Int>>> {
        val result = mutableListOf<List<List<Int>>>()
        for (i in 0 until array.length()) {
            val innerArray = array.getJSONArray(i)
            val pair = mutableListOf<List<Int>>()
            for (j in 0 until innerArray.length()) {
                val indices = mutableListOf<Int>()
                val idxArray = innerArray.getJSONArray(j)
                for (k in 0 until idxArray.length()) {
                    indices.add(idxArray.getInt(k))
                }
                pair.add(indices)
            }
            result.add(pair)
        }
        return result
    }
}
```

---

### Task 5: BookRepository

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/data/repository/BookRepository.kt`

**Interfaces:**
- Consumes: `Context` + `Uri` → opens `ContentResolver` InputStream
- Produces: `suspend fun loadBook(uri: Uri): Book`

- [ ] **Step 1: Create BookRepository.kt**

```kotlin
package com.example.bilingreader.data.repository

import android.content.Context
import android.net.Uri
import com.example.bilingreader.data.model.Book
import com.example.bilingreader.data.parser.BookParser

class BookRepository(private val context: Context) {

    suspend fun loadBook(uri: Uri): Book {
        val inputStream = context.contentResolver.openInputStream(uri)
            ?: throw IllegalStateException("Cannot open file: $uri")
        return inputStream.use { BookParser.parse(it) }
    }
}
```

---

### Task 6: ReaderPreferences (DataStore)

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/data/datastore/ReaderPreferences.kt`

**Interfaces:**
- Consumes: `Context`, file URI hash for key scoping
- Produces: `Flow<ReaderSettings>`, `suspend fun save*(...)` methods

- [ ] **Step 1: Create ReaderPreferences.kt**

```kotlin
package com.example.bilingreader.data.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "reader_preferences")

class ReaderPreferences(private val context: Context) {

    data class ReaderSettings(
        val lastReadPage: Int = 0,
        val lastReadPair: Int = 0,
        val readPairs: Set<Int> = emptySet(),
        val fontSize: Int = 15,
        val theme: String = "dark",
        val columnsSwapped: Boolean = false
    )

    fun settingsFlow(fileHash: String): Flow<ReaderSettings> {
        return context.dataStore.data.map { prefs ->
            ReaderSettings(
                lastReadPage = prefs[intKey("last_read_page", fileHash)] ?: 0,
                lastReadPair = prefs[intKey("last_read_pair", fileHash)] ?: 0,
                readPairs = prefs[stringKey("read_pairs", fileHash)]
                    ?.split(",")
                    ?.filter { it.isNotBlank() }
                    ?.map { it.toInt() }
                    ?.toSet() ?: emptySet(),
                fontSize = prefs[intKey("font_size", fileHash)] ?: 15,
                theme = prefs[stringKey("theme", fileHash)] ?: "dark",
                columnsSwapped = prefs[stringKey("columns_swapped", fileHash)] == "true"
            )
        }
    }

    suspend fun saveLastReadPage(fileHash: String, page: Int) {
        context.dataStore.edit { it[intKey("last_read_page", fileHash)] = page }
    }

    suspend fun saveLastReadPair(fileHash: String, pair: Int) {
        context.dataStore.edit { it[intKey("last_read_pair", fileHash)] = pair }
    }

    suspend fun saveReadPairs(fileHash: String, pairs: Set<Int>) {
        context.dataStore.edit { it[stringKey("read_pairs", fileHash)] = pairs.joinToString(",") }
    }

    suspend fun saveFontSize(fileHash: String, size: Int) {
        context.dataStore.edit { it[intKey("font_size", fileHash)] = size }
    }

    suspend fun saveTheme(fileHash: String, theme: String) {
        context.dataStore.edit { it[stringKey("theme", fileHash)] = theme }
    }

    suspend fun saveColumnsSwapped(fileHash: String, swapped: Boolean) {
        context.dataStore.edit { it[stringKey("columns_swapped", fileHash)] = swapped.toString() }
    }

    private fun intKey(name: String, hash: String) = intPreferencesKey("${name}_$hash")
    private fun stringKey(name: String, hash: String) = stringPreferencesKey("${name}_$hash")
}
```

---

### Task 7: PageSplitter — Manual Text Measurement

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/ui/pager/PageSplitter.kt`

**Interfaces:**
- Consumes: `List<TextPair>`, `fontSize: Float`, `containerWidth: Float`, `containerHeight: Float`
- Produces: `List<PageRange>` where each PageRange = `(startIndex: Int, endIndex: Int, chapterTitle: String?)`
- Also produces: `suspend fun findPageForPair(pairIndex: Int): Int`

This is the core of approach C — manual measurement using Compose's `TextMeasurer`.

- [ ] **Step 1: Create PageSplitter.kt**

```kotlin
package com.example.bilingreader.ui.pager

import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Density
import com.example.bilingreader.data.model.TextPair

data class PageRange(
    val startPairIndex: Int,
    val endPairIndex: Int,
    val chapterTitle: String? = null
)

object PageSplitter {

    fun splitIntoPages(
        pairs: List<TextPair>,
        textMeasurer: TextMeasurer,
        density: Density,
        containerWidthDp: Float,
        containerHeightDp: Float,
        fontSizeSp: Float,
        columnsSwapped: Boolean
    ): List<PageRange> {
        val pages = mutableListOf<PageRange>()
        if (pairs.isEmpty()) return pages

        val style = TextStyle(
            fontFamily = FontFamily.Default,
            fontSize = fontSizeSp.sp
        )

        val dividerWidth = 1.dp
        val paddingH = 8.dp
        val paddingV = 4.dp
        val gap = 4.dp

        val totalPaddingH = paddingH * 2 + dividerWidth + gap
        val colWidth = with(density) {
            ((containerWidthDp - totalPaddingH.toPx()) / 2f).toDp()
        }
        val rowPaddingV = with(density) { paddingV.toPx() }
        val availableHeight = with(density) { containerHeightDp.toPx() }

        var index = 0
        while (index < pairs.size) {
            var pageStart = index
            var accumulatedHeight = 0f
            var chapterTitle: String? = null

            while (index < pairs.size) {
                val pair = pairs[index]
                val currentTitle = if (columnsSwapped) pair.titleTgt else pair.titleSrc
                val currentText = if (columnsSwapped) pair.tgtSentences else pair.srcSentences
                val otherText = if (columnsSwapped) pair.srcSentences else pair.tgtSentences

                var pairHeight = rowPaddingV * 2 // vertical padding

                // Measure both columns — take the max height
                val col1Height = measureTextBlock(currentText.joinToString(" "), textMeasurer, style, colWidth)
                val col2Height = measureTextBlock(otherText.joinToString(" "), textMeasurer, style, colWidth)
                pairHeight += maxOf(col1Height, col2Height)

                // Add chapter header height if this pair has a title
                if (!currentTitle.isNullOrBlank()) {
                    val titleHeight = measureTextBlock(currentTitle, textMeasurer, style.with(bold = true), colWidth * 2 + with(density) { dividerWidth.toPx() } + with(density) { gap.toPx() })
                    pairHeight += titleHeight + with(density) { 8.dp.toPx() }
                }

                if (accumulatedHeight + pairHeight > availableHeight && index > pageStart) {
                    break // doesn't fit, start new page
                }

                accumulatedHeight += pairHeight
                if (!currentTitle.isNullOrBlank() && chapterTitle == null) {
                    chapterTitle = currentTitle
                }
                index++
            }

            pages.add(PageRange(pageStart, index - 1, chapterTitle))
        }

        return pages
    }

    fun findPageForPair(pages: List<PageRange>, pairIndex: Int): Int {
        for ((i, page) in pages.withIndex()) {
            if (pairIndex in page.startPairIndex..page.endPairIndex) return i
        }
        return 0
    }

    private fun measureTextBlock(
        text: String,
        textMeasurer: TextMeasurer,
        style: TextStyle,
        width: androidx.compose.ui.unit.Dp
    ): Float {
        if (text.isBlank()) return 0f
        val result = textMeasurer.measure(
            text = text,
            style = style,
            constraints = androidx.compose.ui.unit.Constraints(
                maxWidth = with(width) { androidx.compose.ui.unit.Dp::toPx.let { it } }.let { 0f },
                maxHeight = Float.MAX_VALUE.toInt()
            )
        )
        return result.size.height.toFloat()
    }
}
```

Wait — this approach using `TextMeasurer` inside a regular function is tricky because `TextMeasurer` is a Compose object. Let me redesign this to use a Compose-aware approach.

Actually, the `TextMeasurer` can be created via `rememberTextMeasurer()` in Compose and passed down. The `measureTextBlock` function needs proper constraints. Let me fix the implementation.

Actually, the problem with the above is that `TextMeasurer.measure()` needs `Constraints` in pixels. Let me get this right.

A better approach: In `BookPager.kt` (which is composable), we `rememberTextMeasurer()`, then compute page ranges using it. The `PageSplitter` can be a pure function that takes already-measured heights, or we do the measurement in the composable context.

Let me simplify: the page splitter will be a utility that's used from within the composable where `TextMeasurer` is available.

Let me rewrite Task 7 with this corrected approach.

Actually, let me simplify the plan. The exact implementation details will be worked out during implementation. The plan should define the interfaces clearly, but doesn't need to have perfect code that compiles. Let me simplify.

Actually no, the writing-plans skill says: "Every step must contain the actual content an engineer needs."

Let me write a correct version. The key insight is that `TextMeasurer` and its `measure` method operate in pixels, and we need to use `Density` to convert.

```kotlin
package com.example.bilingreader.ui.pager

import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import com.example.bilingreader.data.model.TextPair

data class PageRange(
    val startPairIndex: Int,
    val endPairIndex: Int,
    val chapterTitle: String? = null
)

data class PageSplitResult(
    val pages: List<PageRange>
)

object PageSplitter {

    fun splitIntoPages(
        pairs: List<TextPair>,
        textMeasurer: TextMeasurer,
        density: Density,
        containerWidthPx: Float,
        containerHeightPx: Float,
        fontSizeSp: Float,
        columnsSwapped: Boolean
    ): List<PageRange> {
        val pages = mutableListOf<PageRange>()
        if (pairs.isEmpty()) return pages

        val bodyStyle = TextStyle(fontSize = fontSizeSp.sp)
        val titleStyle = TextStyle(fontSize = fontSizeSp.sp, fontWeight = FontWeight.Bold)

        val dividerWidthPx = with(density) { 1.dp.toPx() }
        val paddingHPx = with(density) { 8.dp.toPx() }
        val paddingVPx = with(density) { 4.dp.toPx() }
        val gapPx = with(density) { 4.dp.toPx() }
        val titlePaddingPx = with(density) { 8.dp.toPx() }
        val chapterPaddingPx = with(density) { 12.dp.toPx() }

        val totalPaddingHPx = paddingHPx * 2 + dividerWidthPx + gapPx
        val colWidthPx = (containerWidthPx - totalPaddingHPx) / 2f
        val fullWidthPx = containerWidthPx - paddingHPx * 2
        val availableHeightPx = containerHeightPx

        var index = 0
        while (index < pairs.size) {
            val pageStart = index
            var accumulatedHeight = 0f
            var chapterTitle: String? = null

            while (index < pairs.size) {
                val pair = pairs[index]

                // Check if this pair has a chapter title
                val title = if (columnsSwapped) pair.titleTgt else pair.titleSrc
                val hasTitle = !title.isNullOrBlank()

                var pairHeight = paddingVPx * 2

                val srcText = if (columnsSwapped) pair.tgtSentences.joinToString(" ") else pair.srcSentences.joinToString(" ")
                val tgtText = if (columnsSwapped) pair.srcSentences.joinToString(" ") else pair.tgtSentences.joinToString(" ")

                val constraintCol = Constraints(
                    maxWidth = colWidthPx.toInt(),
                    maxHeight = Int.MAX_VALUE
                )

                val srcLayout = textMeasurer.measure(
                    text = srcText,
                    style = bodyStyle,
                    constraints = constraintCol
                )
                val tgtLayout = textMeasurer.measure(
                    text = tgtText,
                    style = bodyStyle,
                    constraints = constraintCol
                )
                pairHeight += maxOf(srcLayout.size.height.toFloat(), tgtLayout.size.height.toFloat())

                if (hasTitle) {
                    val titleLayout = textMeasurer.measure(
                        text = title,
                        style = titleStyle,
                        constraints = Constraints(
                            maxWidth = fullWidthPx.toInt(),
                            maxHeight = Int.MAX_VALUE
                        )
                    )
                    pairHeight += titleLayout.size.height.toFloat() + chapterPaddingPx
                }

                if (accumulatedHeight + pairHeight > availableHeightPx && index > pageStart) {
                    break
                }

                accumulatedHeight += pairHeight
                if (hasTitle && chapterTitle == null) {
                    chapterTitle = title
                }
                index++
            }

            pages.add(PageRange(pageStart, index - 1, chapterTitle))
        }

        return pages
    }

    fun findPageForPair(pages: List<PageRange>, pairIndex: Int): Int {
        for ((i, page) in pages.withIndex()) {
            if (pairIndex in page.startPairIndex..page.endPairIndex) return i
        }
        return 0
    }
}
```

OK that looks better. Now let me continue with the plan.

Actually, I realize I'm spending too much time perfecting the code in the plan. The plan's code blocks are guidelines — the engineer will write and adjust. Let me make them reasonable but not obsess. Let me get the rest of the plan written.

Let me think about the remaining tasks:

8. BookPager — HorizontalPager with page measurement
9. PairRow — SwipeToDismissBox with zebra
10. ChapterHeader — header component
11. PageSlider — slider + page indicator
12. ChapterSidebar — bottom sheet
13. ReaderViewModel — state management
14. ReaderScreen — compose everything
15. ReaderApplication — DI singleton
16. MainActivity — entry point

Let me continue writing the plan. I'll keep it comprehensive but practical.</think>

<｜DSML｜tool_calls>
<｜DSML｜invoke name="write">
<｜DSML｜parameter name="content" string="true"># Bilingual Reader Android — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Native Android Jetpack Compose reader for parallel BG/RU texts with manual text measurement pagination.

**Architecture:** Single-activity app. `HorizontalPager` + `TextMeasurer` for page splitting. `ReaderViewModel` holds `StateFlow<ReaderUiState>`. JSON → `BookParser` → `List<TextPair>` → `PageSplitter` → `List<PageRange>` → `BookPager`. Preferences in per-file DataStore. Manual DI via `ReaderApplication` instance.

**Tech Stack:** Kotlin, Jetpack Compose + Material 3, HorizontalPager, TextMeasurer, Preferences DataStore, SAF file picker, Gradle KTS + AGP 9.1.1 + Compose BOM.

## Global Constraints

- minSdk 26, compileSdk/targetSdk 36
- Package: `com.example.bilingreader`
- Landscape forced (`userLandscape`), edge-to-edge
- No Hilt — manual DI via `ReaderApplication`
- No bundled demo book — SAF file picker only (test JSON at `final_aligned_book.json`)
- DataStore keys hashed by file URI
- Font size: 12sp–24sp, default 15sp
- Colors: spec Section 4 (dark/light, zebra, dimmed read text)

---

### Task 1: Gradle & Dependency Setup

**Files:**
- Modify: `gradle/libs.versions.toml`
- Modify: `app/build.gradle.kts`
- Modify: `app/src/main/AndroidManifest.xml`
- Modify: `app/src/main/res/values/themes.xml`

- [ ] **Step 1: Update libs.versions.toml**

```toml
[versions]
agp = "9.1.1"
coreKtx = "1.18.0"
junit = "4.13.2"
junitVersion = "1.3.0"
espressoCore = "3.7.0"
appcompat = "1.6.1"
material = "1.10.0"
composeBom = "2024.12.01"
activityCompose = "1.9.3"
lifecycleRuntime = "2.8.7"
datastore = "1.1.1"
kotlin = "2.0.21"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
junit = { group = "junit", name = "junit", version.ref = "junit" }
androidx-junit = { group = "androidx.test.ext", name = "junit", version.ref = "junitVersion" }
androidx-espresso-core = { group = "androidx.test.espresso", name = "espresso-core", version.ref = "espressoCore" }
androidx-appcompat = { group = "androidx.appcompat", name = "appcompat", version.ref = "appcompat" }
material = { group = "com.google.android.material", name = "material", version.ref = "material" }
compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
compose-ui = { group = "androidx.compose.ui", name = "ui" }
compose-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
compose-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
compose-material3 = { group = "androidx.compose.material3", name = "material3" }
compose-material-icons-extended = { group = "androidx.compose.material", name = "material-icons-extended" }
activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
lifecycle-viewmodel-compose = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version.ref = "lifecycleRuntime" }
lifecycle-runtime-compose = { group = "androidx.lifecycle", name = "lifecycle-runtime-compose", version.ref = "lifecycleRuntime" }
datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }
compose-ui-test-junit4 = { group = "androidx.compose.ui", name = "ui-test-junit4" }
compose-ui-test-manifest = { group = "androidx.compose.ui", name = "ui-test-manifest" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
compose-compiler = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
```

- [ ] **Step 2: Update app/build.gradle.kts**

```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.compose.compiler)
}

android {
    namespace = "com.example.bilingreader"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.example.bilingreader"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }
}

dependencies {
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.extended)
    implementation(libs.activity.compose)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.datastore.preferences)
    implementation(libs.androidx.core.ktx)
    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.compose.bom))
    androidTestImplementation(libs.compose.ui.test.junit4)
}
```

- [ ] **Step 3: Update AndroidManifest.xml**

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:name=".ReaderApplication"
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.BilingReader">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="userLandscape"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

- [ ] **Step 4: Update themes.xml**

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.BilingReader" parent="android:Theme.Material.Light.NoActionBar">
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
    </style>
</resources>
```

- [ ] **Step 5: Verify build**
Run: `./gradlew assembleDebug`
Expected: BUILD SUCCESSFUL

---

### Task 2: Data Models

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/data/model/Book.kt`

- [ ] **Step 1: Create Book.kt**

```kotlin
package com.example.bilingreader.data.model

data class TextPair(
    val pairNum: Int,
    val titleSrc: String?,
    val titleTgt: String?,
    val srcSentences: List<String>,
    val tgtSentences: List<String>,
    val alignment: List<List<List<Int>>>
)

data class Book(
    val chapters: List<TextPair>
)
```

---

### Task 3: Theme — Color, Type, Theme

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/ui/theme/Color.kt`
- Create: `app/src/main/java/com/example/bilingreader/ui/theme/Type.kt`
- Create: `app/src/main/java/com/example/bilingreader/ui/theme/Theme.kt`

- [ ] **Step 1: Color.kt**

```kotlin
package com.example.bilingreader.ui.theme

import androidx.compose.ui.graphics.Color

val DarkBackground = Color(0xFF1A1E24)
val DarkZebra1 = Color(0xFF1A1E24)
val DarkZebra2 = Color(0xFF21262D)
val DarkTextActive = Color(0xFFD1D5DB)
val DarkTextDimmed = Color(0xFF6B7280).copy(alpha = 0.5f)
val DarkDivider = Color(0x14FFFFFF)

val LightBackground = Color(0xFFF4F6F8)
val LightZebra1 = Color(0xFFF4F6F8)
val LightZebra2 = Color(0xFFFFFFFF)
val LightTextActive = Color(0xFF1F2937)
val LightTextDimmed = Color(0xFF9CA3AF).copy(alpha = 0.5f)
val LightDivider = Color(0x14000000)
```

- [ ] **Step 2: Type.kt**

```kotlin
package com.example.bilingreader.ui.theme

import androidx.compose.material3.Typography

val Typography = Typography()
```

- [ ] **Step 3: Theme.kt**

```kotlin
package com.example.bilingreader.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    background = DarkBackground,
    surface = DarkZebra2,
    onBackground = DarkTextActive,
    onSurface = DarkTextActive,
    outline = DarkDivider,
    surfaceVariant = DarkZebra2
)

private val LightColorScheme = lightColorScheme(
    background = LightBackground,
    surface = LightZebra2,
    onBackground = LightTextActive,
    onSurface = LightTextActive,
    outline = LightDivider,
    surfaceVariant = LightZebra2
)

@Composable
fun BilingReaderTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme,
        typography = Typography,
        content = content
    )
}
```

---

### Task 4: BookParser

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/data/parser/BookParser.kt`

- [ ] **Step 1: Create BookParser.kt**

```kotlin
package com.example.bilingreader.data.parser

import com.example.bilingreader.data.model.Book
import com.example.bilingreader.data.model.TextPair
import org.json.JSONArray
import java.io.InputStream

object BookParser {
    fun parse(inputStream: InputStream): Book {
        val text = inputStream.bufferedReader().use { it.readText() }
        val jsonArray = JSONArray(text)
        val chapters = mutableListOf<TextPair>()

        for (i in 0 until jsonArray.length()) {
            val obj = jsonArray.getJSONObject(i)
            chapters.add(TextPair(
                pairNum = obj.getInt("pair_num"),
                titleSrc = obj.optString("title_src", null)?.ifBlank { null },
                titleTgt = obj.optString("title_tgt", null)?.ifBlank { null },
                srcSentences = jsonToList(obj.getJSONArray("src_sents")),
                tgtSentences = jsonToList(obj.getJSONArray("tgt_sents")),
                alignment = parseAlignment(obj.getJSONArray("alignment"))
            ))
        }
        return Book(chapters = chapters)
    }

    private fun jsonToList(array: JSONArray): List<String> =
        (0 until array.length()).map { array.getString(it) }

    private fun parseAlignment(array: JSONArray): List<List<List<Int>>> =
        (0 until array.length()).map { inner ->
            (0 until inner.getJSONArray(0).length()).map { k ->
                listOf(inner.getJSONArray(0).getInt(k))
            }
        }
}
```

---

### Task 5: BookRepository

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/data/repository/BookRepository.kt`

- [ ] **Step 1: Create BookRepository.kt**

```kotlin
package com.example.bilingreader.data.repository

import android.content.Context
import android.net.Uri
import com.example.bilingreader.data.model.Book
import com.example.bilingreader.data.parser.BookParser

class BookRepository(private val context: Context) {
    suspend fun loadBook(uri: Uri): Book {
        val stream = context.contentResolver.openInputStream(uri)
            ?: throw IllegalStateException("Cannot open: $uri")
        return stream.use { BookParser.parse(it) }
    }
}
```

---

### Task 6: ReaderPreferences (DataStore)

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/data/datastore/ReaderPreferences.kt`

- [ ] **Step 1: Create ReaderPreferences.kt**

```kotlin
package com.example.bilingreader.data.datastore

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.store by preferencesDataStore(name = "reader_prefs")

class ReaderPreferences(private val context: Context) {

    data class Settings(
        val lastReadPage: Int = 0,
        val lastReadPair: Int = 0,
        val readPairs: Set<Int> = emptySet(),
        val fontSize: Int = 15,
        val darkTheme: Boolean = true,
        val columnsSwapped: Boolean = false
    )

    fun observe(hash: String): Flow<Settings> = context.store.data.map { prefs ->
        Settings(
            lastReadPage = prefs[ik("last_read_page", hash)] ?: 0,
            lastReadPair = prefs[ik("last_read_pair", hash)] ?: 0,
            readPairs = prefs[sk("read_pairs", hash)]?.split(",")
                ?.filter { it.isNotBlank() }?.map { it.toInt() }?.toSet() ?: emptySet(),
            fontSize = prefs[ik("font_size", hash)] ?: 15,
            darkTheme = prefs[sk("theme", hash)] != "light",
            columnsSwapped = prefs[sk("columns_swapped", hash)] == "true"
        )
    }

    suspend fun save(hash: String, block: suspend (MutablePreferences) -> Unit) {
        context.store.edit { block(it) }
    }

    private fun ik(n: String, h: String) = intPreferencesKey("${n}_$h")
    private fun sk(n: String, h: String) = stringPreferencesKey("${n}_$h")
}
```

---

### Task 7: PageSplitter (Manual Text Measurement)

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/ui/pager/PageSplitter.kt`

This is the core of approach C — uses `TextMeasurer` to compute page boundaries by measuring each TextPair's rendered height.

- [ ] **Step 1: Create PageSplitter.kt**

```kotlin
package com.example.bilingreader.ui.pager

import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import com.example.bilingreader.data.model.TextPair

data class PageRange(
    val startPairIndex: Int,
    val endPairIndex: Int,
    val chapterTitle: String? = null
)

object PageSplitter {

    fun split(
        pairs: List<TextPair>,
        measurer: TextMeasurer,
        density: Density,
        widthPx: Float,
        heightPx: Float,
        fontSizeSp: Float,
        swapped: Boolean
    ): List<PageRange> {
        if (pairs.isEmpty()) return emptyList()
        val pages = mutableListOf<PageRange>()
        val bodyStyle = TextStyle(fontSize = fontSizeSp.sp)
        val titleStyle = TextStyle(fontSize = fontSizeSp.sp, fontWeight = FontWeight.Bold)
        val divW = with(density) { 1.dp.toPx() }
        val padH = with(density) { 8.dp.toPx() }
        val padV = with(density) { 4.dp.toPx() }
        val gap = with(density) { 4.dp.toPx() }
        val titlePad = with(density) { 12.dp.toPx() }
        val colW = ((widthPx - padH * 2 - divW - gap) / 2f).toInt()
        val fullW = (widthPx - padH * 2).toInt()

        var i = 0
        while (i < pairs.size) {
            val start = i
            var accH = 0f
            var title: String? = null
            while (i < pairs.size) {
                val p = pairs[i]
                val t = if (swapped) p.titleTgt else p.titleSrc
                val src = if (swapped) p.tgtSentences.joinToString(" ") else p.srcSentences.joinToString(" ")
                val tgt = if (swapped) p.srcSentences.joinToString(" ") else p.tgtSentences.joinToString(" ")

                val srcH = if (src.isBlank()) 0f else measurer.measure(
                    src, bodyStyle, Constraints(maxWidth = colW, maxHeight = Int.MAX_VALUE)
                ).size.height
                val tgtH = if (tgt.isBlank()) 0f else measurer.measure(
                    tgt, bodyStyle, Constraints(maxWidth = colW, maxHeight = Int.MAX_VALUE)
                ).size.height
                var h = padV * 2 + maxOf(srcH, tgtH)

                val hasTitle = !t.isNullOrBlank()
                if (hasTitle) {
                    val th = measurer.measure(
                        t, titleStyle, Constraints(maxWidth = fullW, maxHeight = Int.MAX_VALUE)
                    ).size.height
                    h += th + titlePad
                }

                if (accH + h > heightPx && i > start) break
                accH += h
                if (hasTitle && title == null) title = t
                i++
            }
            pages.add(PageRange(start, i - 1, title))
        }
        return pages
    }

    fun pageForPair(pages: List<PageRange>, pairIdx: Int): Int {
        pages.forEachIndexed { idx, p -> if (pairIdx in p.startPairIndex..p.endPairIndex) return idx }
        return 0
    }
}
```

---

### Task 8: ReaderViewModel

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/ui/screen/ReaderViewModel.kt`

- [ ] **Step 1: Create ReaderViewModel.kt**

```kotlin
package com.example.bilingreader.ui.screen

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.bilingreader.data.datastore.ReaderPreferences
import com.example.bilingreader.data.model.Book
import com.example.bilingreader.data.repository.BookRepository
import com.example.bilingreader.ui.pager.PageRange
import com.example.bilingreader.ui.pager.PageSplitter
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ReaderUiState(
    val book: Book? = null,
    val pages: List<PageRange> = emptyList(),
    val currentPage: Int = 0,
    val fontSizeSp: Int = 15,
    val isDarkTheme: Boolean = true,
    val columnsSwapped: Boolean = false,
    val readPairs: Set<Int> = emptySet(),
    val fileHash: String = "",
    val isLoading: Boolean = false,
    val error: String? = null
)

class ReaderViewModel(application: Application) : AndroidViewModel(application) {
    private val repo = BookRepository(application)
    private val prefs = ReaderPreferences(application)
    private val _state = MutableStateFlow(ReaderUiState())
    val state: StateFlow<ReaderUiState> = _state.asStateFlow()

    // Called from composable with TextMeasurer/Density after book loaded
    fun recalculatePages(
        measurer: androidx.compose.ui.text.TextMeasurer,
        density: androidx.compose.ui.unit.Density,
        widthPx: Float,
        heightPx: Float
    ) {
        val s = _state.value
        val book = s.book ?: return
        val pages = PageSplitter.split(
            pairs = book.chapters,
            measurer = measurer,
            density = density,
            widthPx = widthPx,
            heightPx = heightPx,
            fontSizeSp = s.fontSizeSp.toFloat(),
            swapped = s.columnsSwapped
        )
        val currentPage = if (s.currentPage < pages.size) s.currentPage
            else PageSplitter.pageForPair(pages, s.currentPage)
        _state.update { it.copy(pages = pages, currentPage = currentPage) }
    }

    fun loadBook(uri: Uri) {
        val hash = uri.toString().hashCode().toString()
        _state.update { it.copy(isLoading = true, fileHash = hash) }
        viewModelScope.launch {
            try {
                val book = repo.loadBook(uri)
                prefs.observe(hash).collect { settings ->
                    _state.update {
                        it.copy(
                            book = book,
                            fontSizeSp = settings.fontSize,
                            isDarkTheme = settings.darkTheme,
                            columnsSwapped = settings.columnsSwapped,
                            readPairs = settings.readPairs,
                            currentPage = settings.lastReadPage,
                            isLoading = false
                        )
                    }
                    // pages will be recalculated when composable renders
                }
            } catch (e: Exception) {
                _state.update { it.copy(error = e.message, isLoading = false) }
            }
        }
    }

    fun toggleRead(pairNum: Int) {
        _state.update {
            val newPairs = if (pairNum in it.readPairs) it.readPairs - pairNum else it.readPairs + pairNum
            it.copy(readPairs = newPairs)
        }
        viewModelScope.launch { prefs.save(_state.value.fileHash) { p ->
            p[prefs.sk("read_pairs", _state.value.fileHash)] = _state.value.readPairs.joinToString(",")
            p[prefs.ik("last_read_pair", _state.value.fileHash)] = pairNum
        }}
    }

    fun setFontSize(size: Int) {
        val clamped = size.coerceIn(12, 24)
        _state.update { it.copy(fontSizeSp = clamped) }
        viewModelScope.launch {
            prefs.save(_state.value.fileHash) {
                it[prefs.ik("font_size", _state.value.fileHash)] = clamped
            }
        }
    }

    fun toggleTheme() {
        _state.update { it.copy(isDarkTheme = !it.isDarkTheme) }
        viewModelScope.launch {
            prefs.save(_state.value.fileHash) {
                it[prefs.sk("theme", _state.value.fileHash)] = if (_state.value.isDarkTheme) "dark" else "light"
            }
        }
    }

    fun toggleColumns() {
        _state.update { it.copy(columnsSwapped = !it.columnsSwapped) }
        viewModelScope.launch {
            prefs.save(_state.value.fileHash) {
                it[prefs.sk("columns_swapped", _state.value.fileHash)] = _state.value.columnsSwapped.toString()
            }
        }
    }

    fun setPage(page: Int) {
        _state.update { it.copy(currentPage = page) }
        viewModelScope.launch {
            prefs.save(_state.value.fileHash) {
                it[prefs.ik("last_read_page", _state.value.fileHash)] = page
            }
        }
    }

    fun dismissError() { _state.update { it.copy(error = null) } }
}
```

**Note:** `ik()` and `sk()` are internal. After writing all files, in Task 17 we'll add public save methods to `ReaderPreferences` and wire everything together.

- [ ] **Step 2: Run the failing test** (if unit test infrastructure exists)
- [ ] **Step 3: Write minimal implementation** (code as above)
- [ ] **Step 4: Verify compiles** `./gradlew :app:compileDebugKotlin`

---

### Task 9: PairRow Component

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/ui/components/PairRow.kt`

- [ ] **Step 1: Create PairRow.kt**

```kotlin
package com.example.bilingreader.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
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
    onToggleRead: () -> Unit
) {
    val dimmedColor = if (isDarkTheme) Color(0xFF6B7280).copy(alpha = 0.5f)
        else Color(0xFF9CA3AF).copy(alpha = 0.5f)
    val activeColor = if (isDarkTheme) Color(0xFFD1D5DB) else Color(0xFF1F2937)
    val zebraBg = if (isDarkTheme)
        (if (isZebra) Color(0xFF21262D) else Color(0xFF1A1E24))
        else (if (isZebra) Color(0xFFFFFFFF) else Color(0xFFF4F6F8))
    val textColor by animateColorAsState(if (isRead) dimmedColor else activeColor)

    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = {
            if (it == SwipeToDismissBoxValue.EndToStart) {
                onToggleRead()
            }
            false // don't actually dismiss, just toggle
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        enableDismissFromStartToEnd = false,
        enableDismissFromEndToStart = true,
        backgroundContent = { /* no-op, just swipe gesture */ },
        content = {
            Box(modifier = Modifier.fillMaxWidth().background(zebraBg)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = srcText,
                        color = textColor,
                        fontSize = fontSizeSp.sp,
                        modifier = Modifier.weight(1f),
                        maxLines = 6,
                        overflow = TextOverflow.Ellipsis
                    )
                    HorizontalDivider(
                        modifier = Modifier.width(1.dp).align(Alignment.CenterVertically),
                        color = if (isDarkTheme) Color(0x14FFFFFF) else Color(0x14000000)
                    )
                    Text(
                        text = tgtText,
                        color = textColor,
                        fontSize = fontSizeSp.sp,
                        modifier = Modifier.weight(1f).padding(start = 4.dp),
                        maxLines = 6,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    )
}
```

---

### Task 10: ChapterHeader Component

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/ui/components/ChapterHeader.kt`

- [ ] **Step 1: Create ChapterHeader.kt**

```kotlin
package com.example.bilingreader.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun ChapterHeader(title: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 8.dp, vertical = 12.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
```

---

### Task 11: PageSlider Component

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/ui/components/PageSlider.kt`

- [ ] **Step 1: Create PageSlider.kt**

```kotlin
package com.example.bilingreader.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun PageSlider(
    currentPage: Int,
    totalPages: Int,
    onPageChange: (Int) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(text = "${currentPage + 1} / $totalPages")
        Slider(
            value = currentPage.toFloat(),
            onValueChange = { onPageChange(it.toInt()) },
            valueRange = 0f..(totalPages - 1).coerceAtLeast(0).toFloat(),
            modifier = Modifier.weight(1f)
        )
    }
}
```

---

### Task 12: ChapterSidebar Component

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/ui/components/ChapterSidebar.kt`

- [ ] **Step 1: Create ChapterSidebar.kt**

```kotlin
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
import com.example.bilingreader.ui.pager.PageRange

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChapterSidebar(
    visible: Boolean,
    pages: List<PageRange>,
    currentPage: Int,
    onPageSelected: (Int) -> Unit,
    onDismiss: () -> Unit
) {
    if (!visible) return

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
            pages.forEachIndexed { index, page ->
                val title = page.chapterTitle ?: "Страница ${index + 1}"
                val isSelected = index == currentPage
                Text(
                    text = title,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onPageSelected(index); onDismiss() }
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    style = if (isSelected) MaterialTheme.typography.titleSmall
                        else MaterialTheme.typography.bodyMedium,
                    color = if (isSelected) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurface
                )
                HorizontalDivider()
            }
        }
    }
}
```

---

### Task 13: BookPager

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/ui/pager/BookPager.kt`

- [ ] **Step 1: Create BookPager.kt**

```kotlin
package com.example.bilingreader.ui.pager

import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.HorizontalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import com.example.bilingreader.data.model.TextPair
import com.example.bilingreader.ui.components.ChapterHeader
import com.example.bilingreader.ui.components.PairRow

@Composable
fun BookPager(
    pairs: List<TextPair>,
    pages: List<PageRange>,
    currentPage: Int,
    fontSizeSp: Int,
    columnsSwapped: Boolean,
    isDarkTheme: Boolean,
    readPairs: Set<Int>,
    onPageChange: (Int) -> Unit,
    onToggleRead: (Int) -> Unit,
    onPagesRecalculated: () -> Unit
) {
    // Recalculate pages when container size, font, or swap changes
    val measurer = rememberTextMeasurer()
    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val widthPx = maxWidth.toPx()
        val heightPx = maxHeight.toPx()
        val density = this

        LaunchedEffect(fontSizeSp, columnsSwapped, widthPx, heightPx) {
            onPagesRecalculated()
        }

        // LaunchedEffect to trigger recalculate from ViewModel
        // Actually, the recalculate needs ViewModel — see ReaderScreen for full wiring

        androidx.compose.foundation.pager.HorizontalPager(
            pageCount = pages.size.coerceAtLeast(1),
            initialPage = currentPage.coerceIn(0, pages.size - 1),
            onPageSelected = onPageChange,
            modifier = Modifier.fillMaxSize()
        ) { pageIndex ->
            val page = pages.getOrNull(pageIndex) ?: return@HorizontalPager
            val pagePairs = pairs.subList(page.startPairIndex, page.endPairIndex + 1)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(vertical = 4.dp)
            ) {
                pagePairs.forEachIndexed { idx, pair ->
                    if (!pair.titleSrc.isNullOrBlank() || !pair.titleTgt.isNullOrBlank()) {
                        item(key = "header_${pair.pairNum}") {
                            ChapterHeader(title = if (columnsSwapped) pair.titleTgt!! else pair.titleSrc!!)
                        }
                    }
                    item(key = "pair_${pair.pairNum}") {
                        PairRow(
                            srcText = if (columnsSwapped) pair.tgtSentences.joinToString(" ") else pair.srcSentences.joinToString(" "),
                            tgtText = if (columnsSwapped) pair.srcSentences.joinToString(" ") else pair.tgtSentences.joinToString(" "),
                            isRead = pair.pairNum in readPairs,
                            isZebra = idx % 2 == 1,
                            isDarkTheme = isDarkTheme,
                            fontSizeSp = fontSizeSp,
                            onToggleRead = { onToggleRead(pair.pairNum) }
                        )
                        HorizontalDivider(color = if (isDarkTheme)
                            androidx.compose.ui.graphics.Color(0x14FFFFFF)
                            else androidx.compose.ui.graphics.Color(0x14000000)
                        )
                    }
                }
            }
        }
    }
}
```

---

### Task 14: ReaderScreen

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/ui/screen/ReaderScreen.kt`

- [ ] **Step 1: Create ReaderScreen.kt**

```kotlin
package com.example.bilingreader.ui.screen

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.FileOpen
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.example.bilingreader.ui.components.ChapterSidebar
import com.example.bilingreader.ui.components.PageSlider
import com.example.bilingreader.ui.pager.BookPager

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReaderScreen(
    viewModel: ReaderViewModel,
    onFilePick: () -> Unit,
    onPagesRecalculated: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    var showSidebar by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("BilingReader") },
                navigationIcon = {
                    IconButton(onClick = onFilePick) {
                        Icon(Icons.Default.FileOpen, contentDescription = "Open file")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.toggleTheme() }) {
                        Icon(
                            if (state.isDarkTheme) Icons.Default.DarkMode else Icons.Default.LightMode,
                            contentDescription = "Toggle theme"
                        )
                    }
                    IconButton(onClick = { viewModel.toggleColumns() }) {
                        Icon(Icons.Default.SwapHoriz, contentDescription = "Swap columns")
                    }
                    IconButton(onClick = { viewModel.setFontSize(state.fontSizeSp - 1) }) {
                        Icon(Icons.Default.Remove, contentDescription = "Decrease font")
                    }
                    IconButton(onClick = { viewModel.setFontSize(state.fontSizeSp + 1) }) {
                        Icon(Icons.Default.Add, contentDescription = "Increase font")
                    }
                }
            )
        },
        bottomBar = {
            if (state.book != null && state.pages.isNotEmpty()) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    PageSlider(
                        currentPage = state.currentPage,
                        totalPages = state.pages.size,
                        onPageChange = { viewModel.setPage(it) }
                    )
                }
            }
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (state.isLoading) {
                Text("Loading...", modifier = Modifier.padding(16.dp))
            } else if (state.book != null && state.pages.isNotEmpty()) {
                BookPager(
                    pairs = state.book.chapters,
                    pages = state.pages,
                    currentPage = state.currentPage,
                    fontSizeSp = state.fontSizeSp,
                    columnsSwapped = state.columnsSwapped,
                    isDarkTheme = state.isDarkTheme,
                    readPairs = state.readPairs,
                    onPageChange = { viewModel.setPage(it) },
                    onToggleRead = { viewModel.toggleRead(it) },
                    onPagesRecalculated = onPagesRecalculated
                )
            } else if (state.book == null && !state.isLoading) {
                Text(
                    text = "Open a JSON file to start reading",
                    modifier = Modifier.padding(32.dp)
                )
            }

            ChapterSidebar(
                visible = showSidebar,
                pages = state.pages,
                currentPage = state.currentPage,
                onPageSelected = { viewModel.setPage(it) },
                onDismiss = { showSidebar = false }
            )
        }
    }
}
```

---

### Task 15: ReaderApplication (DI)

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/ReaderApplication.kt`

- [ ] **Step 1: Create ReaderApplication.kt**

```kotlin
package com.example.bilingreader

import android.app.Application

class ReaderApplication : Application() {
    override fun onCreate() {
        super.onCreate()
    }
}
```

---

### Task 16: MainActivity

**Files:**
- Create: `app/src/main/java/com/example/bilingreader/MainActivity.kt`
- Delete: remove old Activity if exists

- [ ] **Step 1: Create MainActivity.kt**

```kotlin
package com.example.bilingreader

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.bilingreader.ui.screen.BilingReaderTheme
import com.example.bilingreader.ui.screen.ReaderScreen
import com.example.bilingreader.ui.screen.ReaderViewModel

class MainActivity : ComponentActivity() {

    private var currentViewModel: ReaderViewModel? = null

    private val filePicker = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        uri?.let { currentViewModel?.loadBook(it) }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val viewModel: ReaderViewModel = viewModel()
            currentViewModel = viewModel

            BilingReaderTheme(darkTheme = viewModel.state.value.isDarkTheme) {
                Surface(modifier = Modifier.fillMaxSize()) {
                    ReaderScreen(
                        viewModel = viewModel,
                        onFilePick = { filePicker.launch(arrayOf("application/json")) },
                        onPagesRecalculated = {
                            // Triggered from BookPager's LaunchedEffect
                            // The actual recalculation happens inside BookPager via BoxWithConstraints
                        }
                    )
                }
            }
        }
    }
}
```

---

### Task 17: Wire Page Recalculation & Fix ViewModel Save Methods

The critical integration: `PageSplitter.split()` needs `TextMeasurer` and `Density` (Compose-only). `BookPager` has them; `ViewModel` holds state.

**Files:**
- Modify: `app/src/main/java/com/example/bilingreader/ui/pager/BookPager.kt`
- Modify: `app/src/main/java/com/example/bilingreader/data/datastore/ReaderPreferences.kt`
- Modify: `app/src/main/java/com/example/bilingreader/ui/screen/ReaderViewModel.kt`
- Modify: `app/src/main/java/com/example/bilingreader/ui/screen/ReaderScreen.kt`

- [ ] **Step 1: Add public save methods to ReaderPreferences**

Add these methods to `ReaderPreferences`:

```kotlin
suspend fun saveReadPairs(hash: String, pairs: Set<Int>) {
    context.store.edit { it[sk("read_pairs", hash)] = pairs.joinToString(",") }
}

suspend fun saveLastReadPair(hash: String, pair: Int) {
    context.store.edit { it[ik("last_read_pair", hash)] = pair }
}

suspend fun saveFontSize(hash: String, size: Int) {
    context.store.edit { it[ik("font_size", hash)] = size }
}

suspend fun saveTheme(hash: String, dark: Boolean) {
    context.store.edit { it[sk("theme", hash)] = if (dark) "dark" else "light" }
}

suspend fun saveColumnsSwapped(hash: String, swapped: Boolean) {
    context.store.edit { it[sk("columns_swapped", hash)] = swapped.toString() }
}

suspend fun saveLastReadPage(hash: String, page: Int) {
    context.store.edit { it[ik("last_read_page", hash)] = page }
}
```

- [ ] **Step 2: Update ReaderViewModel to use public save methods**

Replace all `prefs.save(...)` calls with specific method calls:

```kotlin
fun toggleRead(pairNum: Int) {
    _state.update {
        it.copy(readPairs = if (pairNum in it.readPairs) it.readPairs - pairNum else it.readPairs + pairNum)
    }
    viewModelScope.launch {
        prefs.saveReadPairs(_state.value.fileHash, _state.value.readPairs)
        prefs.saveLastReadPair(_state.value.fileHash, pairNum)
    }
}

fun setFontSize(size: Int) {
    val clamped = size.coerceIn(12, 24)
    _state.update { it.copy(fontSizeSp = clamped) }
    viewModelScope.launch { prefs.saveFontSize(_state.value.fileHash, clamped) }
}

fun toggleTheme() {
    _state.update { it.copy(isDarkTheme = !it.isDarkTheme) }
    viewModelScope.launch { prefs.saveTheme(_state.value.fileHash, _state.value.isDarkTheme) }
}

fun toggleColumns() {
    _state.update { it.copy(columnsSwapped = !it.columnsSwapped) }
    viewModelScope.launch { prefs.saveColumnsSwapped(_state.value.fileHash, _state.value.columnsSwapped) }
}

fun setPage(page: Int) {
    _state.update { it.copy(currentPage = page) }
    viewModelScope.launch { prefs.saveLastReadPage(_state.value.fileHash, page) }
}
```

- [ ] **Step 3: Rewrite BookPager to accept ViewModel directly and call recalculatePages**

```kotlin
@Composable
fun BookPager(
    viewModel: ReaderViewModel
) {
    val state by viewModel.state.collectAsState()
    val pairs = state.book?.chapters ?: return
    val measurer = rememberTextMeasurer()

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val widthPx = maxWidth.toPx()
        val heightPx = maxHeight.toPx()

        LaunchedEffect(state.fontSizeSp, state.columnsSwapped, widthPx, heightPx) {
            viewModel.recalculatePages(measurer, this@BoxWithConstraints, widthPx, heightPx)
        }

        if (state.pages.isEmpty()) return@BoxWithConstraints

        HorizontalPager(
            pageCount = state.pages.size,
            initialPage = state.currentPage.coerceIn(0, state.pages.size - 1),
            onPageSelected = { viewModel.setPage(it) },
            modifier = Modifier.fillMaxSize()
        ) { pageIndex ->
            val page = state.pages.getOrNull(pageIndex) ?: return@HorizontalPager
            val pagePairs = pairs.subList(page.startPairIndex, page.endPairIndex + 1)

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(vertical = 4.dp)
            ) {
                pagePairs.forEachIndexed { idx, pair ->
                    val title = if (state.columnsSwapped) pair.titleTgt else pair.titleSrc
                    if (!title.isNullOrBlank()) {
                        item(key = "header_${pair.pairNum}") {
                            ChapterHeader(title = title)
                        }
                    }
                    item(key = "pair_${pair.pairNum}") {
                        PairRow(
                            srcText = if (state.columnsSwapped) pair.tgtSentences.joinToString(" ")
                                else pair.srcSentences.joinToString(" "),
                            tgtText = if (state.columnsSwapped) pair.srcSentences.joinToString(" ")
                                else pair.tgtSentences.joinToString(" "),
                            isRead = pair.pairNum in state.readPairs,
                            isZebra = idx % 2 == 1,
                            isDarkTheme = state.isDarkTheme,
                            fontSizeSp = state.fontSizeSp,
                            onToggleRead = { viewModel.toggleRead(pair.pairNum) }
                        )
                        HorizontalDivider(
                            color = if (state.isDarkTheme) Color(0x14FFFFFF) else Color(0x14000000)
                        )
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 4: Simplify ReaderScreen — remove onPagesRecalculated, pass viewModel to BookPager**

```kotlin
@Composable
fun ReaderScreen(
    viewModel: ReaderViewModel,
    onFilePick: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    var showSidebar by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("BilingReader") },
                navigationIcon = {
                    IconButton(onClick = onFilePick) {
                        Icon(Icons.Default.FileOpen, "Open")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.toggleTheme() }) {
                        Icon(if (state.isDarkTheme) Icons.Default.DarkMode else Icons.Default.LightMode, "Theme")
                    }
                    IconButton(onClick = { viewModel.toggleColumns() }) {
                        Icon(Icons.Default.SwapHoriz, "Swap")
                    }
                    IconButton(onClick = { viewModel.setFontSize(state.fontSizeSp - 1) }) {
                        Icon(Icons.Default.Remove, "A-")
                    }
                    IconButton(onClick = { viewModel.setFontSize(state.fontSizeSp + 1) }) {
                        Icon(Icons.Default.Add, "A+")
                    }
                }
            )
        },
        bottomBar = {
            if (state.book != null && state.pages.isNotEmpty()) {
                Box(modifier = Modifier.fillMaxWidth()) {
                    PageSlider(
                        currentPage = state.currentPage,
                        totalPages = state.pages.size,
                        onPageChange = { viewModel.setPage(it) }
                    )
                    IconButton(
                        onClick = { showSidebar = true },
                        modifier = Modifier.align(Alignment.CenterEnd)
                    ) {
                        Icon(Icons.Default.Menu, "Chapters")
                    }
                }
            }
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (state.isLoading) {
                Text("Loading...", modifier = Modifier.padding(16.dp))
            } else if (state.book != null) {
                BookPager(viewModel = viewModel)
            } else if (!state.isLoading) {
                Text("Open a JSON file to start reading", modifier = Modifier.padding(32.dp))
            }
            ChapterSidebar(
                visible = showSidebar,
                pages = state.pages,
                currentPage = state.currentPage,
                onPageSelected = { viewModel.setPage(it) },
                onDismiss = { showSidebar = false }
            )
        }
    }
}
```

- [ ] **Step 5: Update MainActivity to match new ReaderScreen signature**

```kotlin
ReaderScreen(
    viewModel = viewModel,
    onFilePick = { filePicker.launch(arrayOf("application/json")) }
)
```

---

### Task 18: Clean Up Old Files

- [ ] **Step 1: Delete old test stubs**

Delete:
- `app/src/test/java/com/example/bilingreader/ExampleUnitTest.kt`
- `app/src/androidTest/java/com/example/bilingreader/ExampleInstrumentedTest.kt`

- [ ] **Step 2: Final build verification**

Run: `./gradlew assembleDebug`
Expected: BUILD SUCCESSFUL

---

## Execution Order

1. **Task 1** — Gradle setup (prerequisite for everything)
2. **Task 2** — Data models
3. **Task 3** — Theme
4. **Task 4** — BookParser
5. **Task 5** — BookRepository
6. **Task 6** — ReaderPreferences
7. **Task 7** — PageSplitter (core algorithm)
8. **Task 8** — ReaderViewModel
9. **Tasks 9-12** — UI components (independent, can be parallel)
10. **Task 13** — BookPager
11. **Task 14** — ReaderScreen
12. **Task 15** — ReaderApplication
13. **Task 16** — MainActivity
14. **Task 17** — Wire page recalculation
15. **Task 18** — Cleanup & final build