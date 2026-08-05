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
    val totalPairs: Int get() = chapters.sumOf { it.pairs.size }
}
