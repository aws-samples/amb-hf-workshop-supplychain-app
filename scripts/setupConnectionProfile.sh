#!/usr/bin/env bash
set -e

CHAIN_FILE=$HOME/managedblockchain-tls-chain.pem

if [ ! -f "$CHAIN_FILE" ]; then
    echo "$CHAIN_FILE does not exist."
    exit 1
fi

if [[ -z "${MEMBER_NAME}" ]] || \
   [[ -z "${MEMBERID}" ]] || \
   [[ -z "${ORDERER}" ]] || \
   [[ -z "${ORDERERNOPORT}" ]] || \
   [[ -z "${PEER1ENDPOINT}" ]] || \
   [[ -z "${PEER1EVENTENDPOINT}" ]] || \
   [[ -z "${PEER1ENDPOINTNOPORT}" ]] || \
   [[ -z "${PEER2ENDPOINT}" ]] || \
   [[ -z "${PEER2EVENTENDPOINT}" ]] || \
   [[ -z "${PEER2ENDPOINTNOPORT}" ]] || \
   [[ -z "${CASERVICEENDPOINT}" ]]; then
  echo "Required environment variables are not set. Run 'source $HOME/.bash_profile' "
  exit 1
fi

export SRCDIR=$PWD/lib/lambda

rm -f $SRCDIR/*.pem $SRCDIR/connection-profile.json

echo "Copying $CHAIN_FILE to lib/lambda"
cp $CHAIN_FILE $SRCDIR

echo "Generating connection-profile.json"

cd $SRCDIR

# subsitute env vars in connection profile
cp connection-profile-template.json connection-profile.json
sed -i "s|%MEMBER_NAME%|$MEMBER_NAME|g" $SRCDIR/connection-profile.json
sed -i "s|%MEMBERID%|$MEMBERID|g" $SRCDIR/connection-profile.json
sed -i "s|%ORDERER%|$ORDERER|g" $SRCDIR/connection-profile.json
sed -i "s|%ORDERERNOPORT%|$ORDERERNOPORT|g" $SRCDIR/connection-profile.json
sed -i "s|%PEER1ENDPOINT%|$PEER1ENDPOINT|g" $SRCDIR/connection-profile.json
sed -i "s|%PEER1EVENTENDPOINT%|$PEER1EVENTENDPOINT|g" $SRCDIR/connection-profile.json
sed -i "s|%PEER1ENDPOINTNOPORT%|$PEER1ENDPOINTNOPORT|g" $SRCDIR/connection-profile.json
sed -i "s|%PEER2ENDPOINT%|$PEER2ENDPOINT|g" $SRCDIR/connection-profile.json
sed -i "s|%PEER2EVENTENDPOINT%|$PEER2EVENTENDPOINT|g" $SRCDIR/connection-profile.json
sed -i "s|%PEER2ENDPOINTNOPORT%|$PEER2ENDPOINTNOPORT|g" $SRCDIR/connection-profile.json
sed -i "s|%CASERVICEENDPOINT%|$CASERVICEENDPOINT|g" $SRCDIR/connection-profile.json
