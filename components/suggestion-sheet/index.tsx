import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetModalProvider,
  useBottomSheetModal,
} from '@gorhom/bottom-sheet';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  bottomSheetModalRef: React.RefObject<BottomSheetModalMethods>
  handleSheetChanges: (index: number) => void
}

export const SuggestionSheet: React.FC<Props> = ({ handleSheetChanges, bottomSheetModalRef }) => {
  const snapPoints = useMemo(() => ['50%'], []);
  const { dismiss } = useBottomSheetModal();

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
    >
      <BottomSheetView style={styles.contentContainer}>
        <View style={styles.bottomSheetContent}>
          <TouchableOpacity onPress={() => dismiss()} >
            <Ionicons name="close" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.bottomSheetTitle}>TODO - fill in some stuff. We can probably base this off what Pi has for it's suggestions on the website.</Text>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    alignItems: 'center',
  },
  bottomSheetContent: {
    backgroundColor: 'white',
    padding: 16,
    position: 'relative',
  },
  bottomSheetTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  bottomSheetText: {
    fontSize: 16,
    marginBottom: 5,
  },
});