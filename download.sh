mkdir -p songs && xargs -n 1 -P 4 curl -OJs --output-dir songs < download_list.txt