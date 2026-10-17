import { Button, type ButtonProps } from '@chakra-ui/react'

function PrimaryButton(props: ButtonProps) {
  return (
    <Button
      size="xl"
      px="12"
      bg="green.500"
      color="white"
      fontWeight="bold"
      shadow="md"
      _hover={{ bg: 'green.600' }}
      _active={{ bg: 'green.700' }}
      {...props}
    />
  )
}

export default PrimaryButton
