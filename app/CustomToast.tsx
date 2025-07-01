// import React, { useEffect, useRef } from 'react';
// import { Animated, Text, View, StyleSheet } from 'react-native';

// export const CustomToast = ({ text1, text2 }: any) => {
//   const progress = useRef(new Animated.Value(1)).current;

//   useEffect(() => {
//     Animated.timing(progress, {
//       toValue: 0,
//       duration: 4000, // 4 seconds
//       useNativeDriver: false,
//     }).start();
//   }, []);

//   const widthInterpolated = progress.interpolate({
//     inputRange: [0, 1],
//     outputRange: ['0%', '100%'],
//   });

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>{text1}</Text>
//       {text2 ? <Text style={styles.message}>{text2}</Text> : null}
//       <Animated.View style={[styles.progress, { width: widthInterpolated }]} />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     backgroundColor: '#FFDDDD',
//     borderLeftWidth: 6,
//     borderLeftColor: '#FF3B30',
//     padding: 12,
//     borderRadius: 8,
//     marginHorizontal: 10,
//   },
//   title: {
//     fontWeight: 'bold',
//     color: '#B00020',
//     fontSize: 16,
//   },
//   message: {
//     color: '#B00020',
//     fontSize: 14,
//     marginTop: 2,
//   },
//   progress: {
//     height: 4,
//     backgroundColor: '#FF3B30',
//     marginTop: 8,
//     borderRadius: 4,
//   },
// });


import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';

export const CustomToast = ({ text1, text2 }: any) => {
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 4000,
      useNativeDriver: false,
    }).start();
  }, []);

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.toastWrapper}>
      <View style={styles.container}>
        <Text style={styles.title}>{text1}</Text>
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
        <Animated.View style={[styles.progress, { width: widthInterpolated }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    bottom: 40, // distance from the bottom
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#FFDDDD',
    borderLeftWidth: 6,
    borderLeftColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 10,
    maxWidth: '90%',
    elevation: 5, // shadow on Android
    shadowColor: '#000', // shadow on iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  title: {
    fontWeight: 'bold',
    color: '#B00020',
    fontSize: 16,
  },
  message: {
    color: '#B00020',
    fontSize: 14,
    marginTop: 2,
  },
  progress: {
    height: 4,
    backgroundColor: '#FF3B30',
    marginTop: 8,
    borderRadius: 4,
  },
});
