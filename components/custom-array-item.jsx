// Componente personalizado para manejar items de array en AdminJS
import React from 'react'
import { Box, Button, Label, Icon } from '@adminjs/design-system'
import { useTranslation } from 'adminjs'

const CustomArrayItem = (props) => {
  const { property, record, itemIndex, onChange } = props
  const { translateProperty } = useTranslation()
  const path = `${property.path}.${itemIndex}`

  // Manejar la eliminación de un ítem del array
  const handleRemove = () => {
    const newValue = [...record.params[property.path]]
    newValue.splice(itemIndex, 1)
    onChange(property.path, newValue)
  }

  // Obtiene subpropiedades del item actual
  const getSubPropertyProps = (subProperty) => ({
    property: subProperty,
    record,
    onChange,
  })

  return (
    <Box marginBottom="lg" data-testid={`array-item-${property.path}-${itemIndex}`}>
      <Box 
        display="flex" 
        alignItems="center" 
        justifyContent="space-between"
        marginBottom="sm"
      >
        <Label>
          {translateProperty(`${property.path}.${itemIndex}`)}
          {` #${itemIndex + 1}`}
        </Label>
        <Button 
          variant="danger"
          size="sm"
          rounded
          onClick={handleRemove}
        >
          <Icon icon="TrashAlt" />
          Eliminar
        </Button>
      </Box>
      <Box display="flex" flexDirection="column" marginLeft="xl">
        {property.subProperties.filter(subProperty => 
          subProperty.name !== '_id' && 
          !subProperty.isId
        ).map(subProperty => (
          <React.Fragment key={`${path}.${subProperty.name}`}>
            {props.ItemComponent && (
              <props.ItemComponent 
                {...getSubPropertyProps(subProperty)}
                path={`${path}.${subProperty.name}`}
              />
            )}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  )
}

export default CustomArrayItem
