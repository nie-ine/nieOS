#!/usr/bin/env bash

DATE=`date +%y-%m-%d`

tar -zcvf ${DATE}.tar.gz .mongoData

mv ${DATE}.tar.gz ./backup

# tar -Pzxvf 19-04-29.tar.gz
# --> example to untar
