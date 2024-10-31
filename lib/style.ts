import { StyleSheet } from 'react-native';

export const selectedButtonColor = 'rgba(76, 175, 80, 0.2)'

export const theme = StyleSheet.create({
  // Titles (headers) for various components
  title: {
    fontSize: 24, // Slightly smaller, easily adjustable
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#bbb', // Slightly darker border color
    backgroundColor: '#e5e5e5', // Slightly darker background for contrast
    paddingVertical: 12,
    paddingHorizontal: 20, // Padding for left and right for better visual spacing
    marginBottom: 30,
    color: '#333',
    textAlign: 'center',
    minWidth: '80%', // Minimum width of 80% of the screen
    maxWidth: '100%', // Ensure it doesn't exceed the screen width
    borderRadius: 25, // Rounded corners for tube-like appearance
  },
  inputFocused: {
    borderColor: '#007BFF', // Blue accent color on focus
    backgroundColor: '#f0f0f0', // Lighter background on focus
  },
  // Generic button styling
  button: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  // Selected button (for highlighting selected items)
  selectedButton: {
    backgroundColor: selectedButtonColor,
  },
  // Button text for all buttons
  buttonText: {
    color: '#555', // Subtle text color
    fontSize: 16,
  },
  // Darker text for selected buttons
  selectedButtonText: {
    color: '#333', // Darker text for contrast
  },
});

export const signupStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%'
  },
  signupSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%'
  },
  sectionContent: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    paddingVertical: 30,
    paddingHorizontal: 20
  },
  sectionMainContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#007BFF', // Primary color for confirm button
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  confirmButtonText: {
    color: '#fff', // White text on confirm button
    fontSize: 16,
  },
});