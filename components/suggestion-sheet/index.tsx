import BottomSheet, {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetModalProvider,
  useBottomSheetModal,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { BottomSheetMethods, BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  bottomSheetRef: React.RefObject<BottomSheetMethods>
}

export const SuggestionSheet: React.FC<Props> = ({ bottomSheetRef }) => {
  const snapPoints = useMemo(() => ['50%'], []);

  const renderBackdrop = useCallback(
		(props: any) => (
			<BottomSheetBackdrop
				{...props}
				disappearsOnIndex={-1}
				appearsOnIndex={1}
        pressBehavior={'close'}
			/>
		),
		[]
	);

  return (
    <BottomSheet
      snapPoints={snapPoints}
      ref={bottomSheetRef}
      enablePanDownToClose={true}
      index={-1}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.contentContainer}>
        <Text>Fill in some suggestions here.</Text>
      </BottomSheetView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: 'grey',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
  },
});