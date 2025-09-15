#!/bin/bash

# Configuration pour le build Android local
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home
export PATH="/usr/local/opt/node@18/bin:$PATH"
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$PATH
export NODE_ENV=development

echo "Environnement Android configuré :"
echo "JAVA_HOME: $JAVA_HOME"
echo "ANDROID_HOME: $ANDROID_HOME"
echo "Node version: $(node --version)"
echo "Java version: $(java -version 2>&1 | head -1)"
