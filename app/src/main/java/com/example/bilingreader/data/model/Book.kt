package com.example.bilingreader.data.model

data class AlignedPair(
    val src: String,
    val tgt: String
)

data class Chapter(
    val pairNum: Int,
    val titleSrc: String?,
    val titleTgt: String?,
    val pairs: List<AlignedPair>
)

data class Book(
    val chapters: List<Chapter>
) {
    // Computed once and cached: totalPairs was being summed over every chapter on every
    // interaction (each swipe, each scroll settle, each slider release) even though the book's
    // contents never change after it's loaded.
    val totalPairs: Int by lazy(LazyThreadSafetyMode.NONE) { chapters.sumOf { it.pairs.size } }
}
