plugins {
    id("com.android.application")
}

// The Android app is a thin shell: a fullscreen WebView showing the single-file web build
// (../dist/index.html, produced by `npm run build` in the repository root). Only index.html is
// bundled; the PWA manifest, icons and service worker are web-only.
val webDist = rootProject.file("../dist")
val webAssets = layout.buildDirectory.dir("webassets")
val copyWeb by tasks.registering(Copy::class) {
    from(webDist) { include("index.html") }
    into(webAssets)
    doFirst {
        check(webDist.resolve("index.html").exists()) { "Run `npm run build` in the repository root first (missing ${webDist.resolve("index.html")})" }
    }
}

android {
    namespace = "org.treasuremountain.app"
    compileSdk = 35
    buildToolsVersion = "35.0.0"

    defaultConfig {
        applicationId = "org.treasuremountain.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
        resourceConfigurations += listOf("en")
    }

    sourceSets["main"].assets.srcDir(webAssets)

    signingConfigs {
        // Sideload-only signing key, checked in on purpose so every build installs over the previous
        // one. It protects nothing: the app is not on any store.
        create("release") {
            storeFile = file("release.keystore")
            storePassword = System.getenv("TM_KEYSTORE_PASSWORD") ?: "treasure"
            keyAlias = "treasure"
            keyPassword = System.getenv("TM_KEY_PASSWORD") ?: "treasure"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
            ndk { debugSymbolLevel = "none" }
        }
        debug {
            signingConfig = signingConfigs.getByName("release")
        }
    }

    packaging {
        resources.excludes += listOf("META-INF/**", "kotlin/**", "**/*.version", "DebugProbesKt.bin")
        dex.useLegacyPackaging = false
    }

    lint { abortOnError = false }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    dependenciesInfo { includeInApk = false; includeInBundle = false }
}

tasks.matching { it.name == "preBuild" }.configureEach { dependsOn(copyWeb) }
tasks.matching { it.name.startsWith("merge") && it.name.endsWith("Assets") }.configureEach { dependsOn(copyWeb) }
