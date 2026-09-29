#!/bin/sh
# Prints the centre pixel colour of a rendered MP4 at t=1.5 s and t=3.5 s.
for t in 1.5 3.5; do
  rgb=$(ffmpeg -v error -ss "$t" -i "$1" -frames:v 1 -vf "crop=2:2:959:539,scale=1:1" -f rawvideo -pix_fmt rgb24 - | xxd -p)
  echo "t=$t  #$rgb"
done
