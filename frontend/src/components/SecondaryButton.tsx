import { Button, type ButtonProps } from '@chakra-ui/react'

function SecondaryButton(props: ButtonProps) {
  return (
    <Button
      variant="outline"
      size="lg"
      colorPalette="green"
      bg="white"
      {...props}
    />
  )
}

export default SecondaryButton
