How to build apk

Copy the web assets to android folder 
1. npx cap sync android
Just build the apk wait for the release
2. cd android; .\gradlew.bat assembleDebug; cd ..

or use this got clean build
take note this is optional
3. cd android; .\gradlew.bat clean; cd ..; npx cap sync android; cd android; .\gradlew.bat assembleDebug; cd ..